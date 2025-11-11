/**
 * Admin endpoints for moderation
 * Protected by ADMIN_SECRET environment variable
 */

import { getReports, banUser, updateUser, createPassForUser } from '../lib/db.js';

/**
 * Verify admin secret
 */
function verifyAdminSecret(req) {
  const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
  return secret === process.env.ADMIN_SECRET;
}

/**
 * Main admin handler
 */
export default async function handler(req, res) {
  // Verify admin secret
  if (!verifyAdminSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'reports':
        return await handleGetReports(req, res);
      
      case 'ban':
        return await handleBanUser(req, res);
      
      case 'unban':
        return await handleUnbanUser(req, res);
      
      case 'mark_verified':
        return await handleMarkVerified(req, res);
      
      case 'grant_pass':
        return await handleGrantPass(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Admin endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all reports
 * GET /api/admin?action=reports&status=pending
 */
async function handleGetReports(req, res) {
  const { status } = req.query;
  
  const reports = await getReports(status || null);
  
  return res.status(200).json({
    ok: true,
    reports
  });
}

/**
 * Ban a user
 * POST /api/admin?action=ban
 * Body: { tg_id: number }
 */
async function handleBanUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { tg_id } = req.body;
  
  if (!tg_id) {
    return res.status(400).json({ error: 'Missing tg_id' });
  }
  
  const user = await banUser(tg_id, true);
  
  return res.status(200).json({
    ok: true,
    message: `User ${tg_id} banned`,
    user
  });
}

/**
 * Unban a user
 * POST /api/admin?action=unban
 * Body: { tg_id: number }
 */
async function handleUnbanUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { tg_id } = req.body;
  
  if (!tg_id) {
    return res.status(400).json({ error: 'Missing tg_id' });
  }
  
  const user = await banUser(tg_id, false);
  
  return res.status(200).json({
    ok: true,
    message: `User ${tg_id} unbanned`,
    user
  });
}

/**
 * Manually mark a user as verified
 * POST /api/admin?action=mark_verified
 * Body: { tg_id: number }
 */
async function handleMarkVerified(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { tg_id } = req.body;
  
  if (!tg_id) {
    return res.status(400).json({ error: 'Missing tg_id' });
  }
  
  const user = await updateUser(tg_id, {
    email_verified: true,
    verified_at: new Date().toISOString()
  });
  
  return res.status(200).json({
    ok: true,
    message: `User ${tg_id} marked as verified`,
    user
  });
}

/**
 * Grant a free pass to a user
 * POST /api/admin?action=grant_pass
 * Body: { tg_id: number }
 */
async function handleGrantPass(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { tg_id } = req.body;
  
  if (!tg_id) {
    return res.status(400).json({ error: 'Missing tg_id' });
  }
  
  const referenceId = `admin_grant:${tg_id}:${Date.now()}`;
  const pass = await createPassForUser(tg_id, referenceId);
  
  return res.status(200).json({
    ok: true,
    message: `Pass granted to user ${tg_id}`,
    pass
  });
}
