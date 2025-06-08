// Test Environment Variables
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  res.json({
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    defaultPassword: 'qwe123',
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    timestamp: new Date().toISOString()
  })
}