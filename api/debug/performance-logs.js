/**
 * Performance Logs Debug Endpoint
 * Shows recent performance timing data for analysis
 */

// In-memory storage for recent performance logs
let recentLogs = []
const MAX_LOGS = 20

// Function to add performance log (called from chat-with-memory.js)
export function addPerfLog(logData) {
  const timestamp = new Date().toISOString()
  recentLogs.unshift({ timestamp, ...logData })
  
  // Keep only recent logs
  if (recentLogs.length > MAX_LOGS) {
    recentLogs = recentLogs.slice(0, MAX_LOGS)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const summary = {
      totalRequests: recentLogs.length,
      averageTTFT: recentLogs.filter(log => log.ttft).reduce((sum, log) => sum + log.ttft, 0) / recentLogs.filter(log => log.ttft).length || 0,
      averageConfigTime: recentLogs.filter(log => log.configTime).reduce((sum, log) => sum + log.configTime, 0) / recentLogs.filter(log => log.configTime).length || 0,
      averageAssistantTime: recentLogs.filter(log => log.assistantTime).reduce((sum, log) => sum + log.assistantTime, 0) / recentLogs.filter(log => log.assistantTime).length || 0
    }

    res.json({
      success: true,
      summary,
      recentLogs: recentLogs.slice(0, 10), // Return top 10 most recent
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Performance logs error:', error)
    res.status(500).json({ 
      error: 'Failed to get performance logs',
      details: error.message 
    })
  }
}