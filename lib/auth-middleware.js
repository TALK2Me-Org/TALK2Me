/**
 * Dual Auth Middleware - TALK2Me
 * 
 * Obsługuje BOTH custom JWT AND Supabase Auth w jednym middleware
 * Zachowuje 100% backward compatibility z istniejącym systemem
 * 
 * Priority Order:
 * 1. Supabase Auth (preferred for new users)
 * 2. Custom JWT (fallback for existing users)
 * 3. Guest mode (no auth)
 * 
 * @author Claude (AI Assistant) - Supabase Native Auth Integration
 * @date 03.07.2025
 * @status ✅ DUAL AUTH IMPLEMENTATION
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

/**
 * Get Supabase client instance
 * Creates client only when needed to avoid env var issues
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Universal User Context Object
 * Unifies both Supabase and custom JWT user data
 */
class UserContext {
  constructor(userData, authType) {
    this.id = userData.id;
    this.email = userData.email;
    this.name = userData.name || userData.user_metadata?.name || 'User';
    this.authType = authType; // 'supabase' | 'custom_jwt' | 'guest'
    this.isAuthenticated = authType !== 'guest';
    this.raw = userData; // Keep original data for reference
  }

  /**
   * Get unified user ID for memory system
   * @returns {string} UUID compatible with all memory providers
   */
  getUserId() {
    return this.id;
  }

  /**
   * Get user display info
   * @returns {object} User info for UI
   */
  getDisplayInfo() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      authType: this.authType,
      isAuthenticated: this.isAuthenticated
    };
  }
}

/**
 * Dual Auth Middleware
 * Checks both Supabase Auth and Custom JWT
 */
export class DualAuthMiddleware {
  /**
   * Extract and verify user from request
   * @param {Request} req - Express request object
   * @returns {Promise<UserContext>} User context or guest
   */
  static async authenticateUser(req) {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 DualAuth: Starting authentication check');
    console.log('🔐 DualAuth: Auth header present:', !!authHeader);

    // Method 1: Try Supabase Auth first (preferred)
    const supabaseUser = await this.trySupabaseAuth(authHeader);
    if (supabaseUser) {
      console.log('✅ DualAuth: Supabase Auth successful');
      
      // Map Supabase user to custom users table for compatibility
      const mappedUser = await this.mapSupabaseUser(supabaseUser);
      if (mappedUser) {
        // Use mapped user data for consistency
        const compatibleUser = {
          id: mappedUser.id, // Use custom table UUID
          email: mappedUser.email,
          name: mappedUser.name
        };
        return new UserContext(compatibleUser, 'supabase');
      }
      
      // Fallback to original Supabase user if mapping fails
      return new UserContext(supabaseUser, 'supabase');
    }

    // Method 2: Try Custom JWT fallback (existing users)
    const customJWTUser = await this.tryCustomJWT(authHeader);
    if (customJWTUser) {
      console.log('✅ DualAuth: Custom JWT successful');
      return new UserContext(customJWTUser, 'custom_jwt');
    }

    // Method 3: Guest mode
    console.log('⚠️ DualAuth: No valid auth found, using guest mode');
    return new UserContext({ id: null, email: null, name: 'Guest' }, 'guest');
  }

  /**
   * Try Supabase Auth verification
   * @param {string} authHeader - Authorization header
   * @returns {Promise<object|null>} Supabase user or null
   */
  static async trySupabaseAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.split(' ')[1];
      console.log('🔍 DualAuth: Verifying Supabase token...');

      // Verify token with Supabase
      const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);
      
      if (error || !user) {
        console.log('❌ DualAuth: Supabase auth failed:', error?.message || 'No user');
        return null;
      }

      console.log('✅ DualAuth: Supabase user verified:', user.id);
      return user;
    } catch (error) {
      console.log('❌ DualAuth: Supabase auth exception:', error.message);
      return null;
    }
  }

  /**
   * Try Custom JWT verification (backward compatibility)
   * @param {string} authHeader - Authorization header
   * @returns {Promise<object|null>} Custom JWT user or null
   */
  static async tryCustomJWT(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.split(' ')[1];
      console.log('🔍 DualAuth: Verifying custom JWT...');

      // Get JWT secret from database
      const { data: config } = await getSupabaseClient()
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'jwt_secret')
        .single();

      const jwtSecret = config?.config_value;
      if (!jwtSecret) {
        console.log('❌ DualAuth: JWT secret not configured');
        return null;
      }

      // Verify JWT
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ DualAuth: Custom JWT verified:', decoded.id);
      
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };
    } catch (error) {
      console.log('❌ DualAuth: Custom JWT verification failed:', error.message);
      return null;
    }
  }

  /**
   * Middleware for Express routes
   * Adds userContext to request object
   */
  static async middleware(req, res, next) {
    try {
      req.userContext = await this.authenticateUser(req);
      console.log('🔐 DualAuth: User context set:', req.userContext.getDisplayInfo());
      next();
    } catch (error) {
      console.error('❌ DualAuth: Middleware error:', error);
      req.userContext = new UserContext({ id: null, email: null, name: 'Guest' }, 'guest');
      next();
    }
  }

  /**
   * Require authentication middleware
   * Returns 401 if user is not authenticated
   */
  static requireAuth(req, res, next) {
    if (!req.userContext || !req.userContext.isAuthenticated) {
      return res.status(401).json({ 
        error: 'Authentication required',
        authType: 'dual',
        supportedMethods: ['supabase', 'custom_jwt']
      });
    }
    next();
  }

  /**
   * Map Supabase user to custom users table
   * Creates or updates user record for compatibility with existing system
   */
  static async mapSupabaseUser(supabaseUser) {
    try {
      console.log('🔄 DualAuth: Mapping Supabase user to custom table...', {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        hasMetadata: !!supabaseUser.user_metadata
      });

      const supabase = getSupabaseClient();
      
      // Strategy 1: Check by Supabase ID first (exact match)
      const { data: existingById } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (existingById) {
        console.log('✅ DualAuth: Found user by Supabase ID:', existingById.id);
        
        // Update last_login and auth_provider for tracking
        await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString(),
            auth_provider: 'supabase'
          })
          .eq('id', existingById.id);
        
        return existingById;
      }

      // Strategy 2: Check by email (migration case)
      const { data: existingByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email.toLowerCase())
        .single();

      if (existingByEmail) {
        console.log('✅ DualAuth: Found existing user by email, linking to Supabase...');
        
        // Update existing user to link with Supabase ID
        const { data: linkedUser } = await supabase
          .from('users')
          .update({
            auth_provider: 'supabase',
            is_verified: supabaseUser.email_confirmed_at ? true : false,
            last_login: new Date().toISOString()
          })
          .eq('id', existingByEmail.id)
          .select()
          .single();

        return linkedUser || existingByEmail;
      }

      // Strategy 3: Create new user record
      console.log('🆕 DualAuth: Creating new user in custom table...');
      
      const newUser = {
        id: supabaseUser.id, // Use Supabase UUID for consistency
        email: supabaseUser.email.toLowerCase(),
        password: 'supabase_auth_managed', // Placeholder - Supabase manages auth
        name: this.extractUserName(supabaseUser),
        auth_provider: 'supabase',
        is_verified: supabaseUser.email_confirmed_at ? true : false,
        last_login: new Date().toISOString(),
        created_at: supabaseUser.created_at || new Date().toISOString(),
        subscription_type: 'free'
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('❌ DualAuth: Failed to create user in custom table:', createError);
        
        // If creation fails due to duplicate, try to fetch existing user
        if (createError.code === '23505') { // Unique constraint violation
          console.log('🔄 DualAuth: User exists, retrying fetch...');
          const { data: retryUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', supabaseUser.email.toLowerCase())
            .single();
          return retryUser;
        }
        
        return null;
      }

      console.log('✅ DualAuth: User mapped to custom table successfully:', createdUser.id);
      return createdUser;
    } catch (error) {
      console.error('❌ DualAuth: User mapping error:', error);
      return null;
    }
  }

  /**
   * Extract user name from Supabase user metadata
   */
  static extractUserName(supabaseUser) {
    // Try various metadata sources for name
    if (supabaseUser.user_metadata?.name) {
      return supabaseUser.user_metadata.name;
    }
    
    if (supabaseUser.user_metadata?.full_name) {
      return supabaseUser.user_metadata.full_name;
    }
    
    if (supabaseUser.user_metadata?.first_name) {
      const lastName = supabaseUser.user_metadata.last_name || '';
      return `${supabaseUser.user_metadata.first_name} ${lastName}`.trim();
    }
    
    // Fallback to email username
    return supabaseUser.email.split('@')[0];
  }

  /**
   * Get unified user ID for any auth type
   * @param {object} req - Express request with userContext
   * @returns {string|null} User ID or null
   */
  static getUserId(req) {
    return req.userContext?.getUserId() || null;
  }

  /**
   * Check if user is authenticated with any method
   * @param {object} req - Express request with userContext
   * @returns {boolean} Is authenticated
   */
  static isAuthenticated(req) {
    return req.userContext?.isAuthenticated || false;
  }

  /**
   * Get auth type for current user
   * @param {object} req - Express request with userContext
   * @returns {string} Auth type: 'supabase' | 'custom_jwt' | 'guest'
   */
  static getAuthType(req) {
    return req.userContext?.authType || 'guest';
  }
}

export default DualAuthMiddleware;