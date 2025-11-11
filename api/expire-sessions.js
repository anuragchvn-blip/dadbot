/**
 * Expire chat sessions endpoint
 * Can be called by Vercel Cron or external scheduler
 */

import { useSupabase, supabaseQuery, sqliteQuery } from '../lib/supabaseClient.js';
import { sendMessage } from '../lib/telegram.js';

export default async function handler(req, res) {
  // Optional: Protect with secret
  const authHeader = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const now = new Date().toISOString();
    let expiredSessions = [];
    
    // Find expired sessions that haven't been notified
    if (useSupabase) {
      expiredSessions = await supabaseQuery('chat_sessions', {
        select: '*',
        // Note: This is simplified. In production, add a 'notified' column
      });
      
      expiredSessions = expiredSessions.filter(s => 
        s.expires_at < now && !s.notified
      );
    } else {
      expiredSessions = sqliteQuery(
        'SELECT * FROM chat_sessions WHERE expires_at < ? LIMIT 100',
        [now]
      );
    }
    
    let notifiedCount = 0;
    
    // Send expiry notifications
    for (const session of expiredSessions) {
      try {
        await sendMessage(
          session.user1_tg_id,
          '⏰ Your timed chat session has expired.\n\nBuy another Daily Pass to chat more!'
        );
        
        await sendMessage(
          session.user2_tg_id,
          '⏰ Your timed chat session has expired.\n\nBuy another Daily Pass to chat more!'
        );
        
        notifiedCount++;
      } catch (error) {
        console.error(`Failed to notify session ${session.id}:`, error);
      }
    }
    
    return res.status(200).json({
      ok: true,
      expired: expiredSessions.length,
      notified: notifiedCount
    });
  } catch (error) {
    console.error('Expire sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
