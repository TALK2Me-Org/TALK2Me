/**
 * POST /api/update-profile
 * 
 * Endpoint do aktualizacji profilu psychologicznego użytkownika.
 * Wykonuje operację UPSERT - tworzy nowy profil lub aktualizuje istniejący.
 * 
 * @route POST /api/update-profile
 * @body {Object} profile - Obiekt profilu do zapisania
 * @body {string} profile.user_id - UUID użytkownika (wymagane)
 * @body {string} profile.attachment_style - Styl przywiązania: bezpieczny/lękowy/unikający/zdezorganizowany
 * @body {Array<string>} profile.dominujące_schematy - Lista dominujących schematów psychologicznych
 * @body {Array<string>} profile.język_miłości - Preferowane języki miłości
 * @body {string} profile.styl_komunikacji - Styl komunikacji: asertywny/pasywny/agresywny/emocjonalny/logiczny
 * @body {string} profile.rola - Rola życiowa użytkownika
 * @body {string} profile.dzieciństwo - Opis doświadczeń z dzieciństwa
 * @body {string} profile.aktualne_wyzywania - Obecne wyzwania życiowe
 * @body {Array<string>} profile.cykliczne_wzorce - Powtarzające się wzorce zachowań
 * 
 * @returns {Object} 200 - { success: true, message, data }
 * @returns {Object} 400 - { error: "Validation error" }
 * @returns {Object} 500 - { error: "Server error", details: "..." }
 * 
 * @author Claude (AI Assistant)
 * @date 18.06.2025
 * @session 15
 */
import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  console.log('🧠 POST /api/update-profile - Processing request...');
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract data from request body
    const {
      user_id,
      attachment_style,
      dominujące_schematy,
      język_miłości,
      styl_komunikacji,
      rola,
      dzieciństwo,
      aktualne_wyzywania,
      cykliczne_wzorce
    } = req.body;

    // Validate required field
    if (!user_id) {
      console.error('❌ Missing required field: user_id');
      return res.status(400).json({ 
        error: 'Missing required field: user_id' 
      });
    }

    // Validate user_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.error('❌ Invalid user_id format');
      return res.status(400).json({ 
        error: 'Invalid user_id format. Must be a valid UUID' 
      });
    }

    // Validate array fields
    const arrayFields = ['dominujące_schematy', 'język_miłości', 'cykliczne_wzorce'];
    for (const field of arrayFields) {
      if (req.body[field] && !Array.isArray(req.body[field])) {
        return res.status(400).json({ 
          error: `Field '${field}' must be an array` 
        });
      }
    }

    // Validate attachment styles
    const validAttachmentStyles = ['bezpieczny', 'lękowy', 'unikający', 'zdezorganizowany', 'secure', 'anxious', 'avoidant', 'disorganized'];
    if (attachment_style && !validAttachmentStyles.includes(attachment_style.toLowerCase())) {
      console.warn('⚠️ Non-standard attachment style:', attachment_style);
    }

    // Validate communication styles
    const validCommunicationStyles = ['asertywny', 'pasywny', 'agresywny', 'pasywno-agresywny', 'emocjonalny', 'logiczny', 'assertive', 'passive', 'aggressive', 'passive-aggressive', 'emotional', 'logical'];
    if (styl_komunikacji && !validCommunicationStyles.includes(styl_komunikacji.toLowerCase())) {
      console.warn('⚠️ Non-standard communication style:', styl_komunikacji);
    }

    console.log('🔍 Checking if user profile exists...');
    
    // Check if profile already exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('user_profile')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine
      console.error('❌ Error checking existing profile:', selectError);
      return res.status(500).json({ 
        error: 'Failed to check existing profile',
        details: selectError.message
      });
    }

    // Prepare profile data
    const profileData = {
      user_id,
      attachment_style: attachment_style || null,
      dominujące_schematy: dominujące_schematy || [],
      język_miłości: język_miłości || [],
      styl_komunikacji: styl_komunikacji || null,
      rola: rola || null,
      dzieciństwo: dzieciństwo || null,
      aktualne_wyzywania: aktualne_wyzywania || null,
      cykliczne_wzorce: cykliczne_wzorce || [],
      last_updated: new Date().toISOString()
    };

    let result;
    
    if (existingProfile) {
      // Update existing profile
      console.log('📝 Updating existing profile...');
      
      const { data, error } = await supabase
        .from('user_profile')
        .update(profileData)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        return res.status(500).json({ 
          error: 'Failed to update profile',
          details: error.message
        });
      }
      
      result = data;
      console.log('✅ Profile updated successfully');
      
    } else {
      // Insert new profile
      console.log('📝 Creating new profile...');
      
      const { data, error } = await supabase
        .from('user_profile')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('❌ Insert error:', error);
        return res.status(500).json({ 
          error: 'Failed to create profile',
          details: error.message
        });
      }
      
      result = data;
      console.log('✅ Profile created successfully');
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully',
      data: {
        user_id: result.user_id,
        attachment_style: result.attachment_style,
        last_updated: result.last_updated
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};