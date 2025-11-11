/**
 * Matching algorithm for DonutDot bot
 * Returns next candidate profile based on user preferences
 */

import { getUser, getLikedUserIds } from './db.js';
import { useSupabase, supabaseQuery, sqliteQuery } from './supabaseClient.js';

/**
 * Get next candidate profile for browsing
 * @param {number} userId - User's Telegram ID
 * @param {object} filters - Preference filters
 * @param {number} page - Pagination offset
 * @returns {Promise<object|null>} Candidate user or null
 */
export async function getNextCandidate(userId, filters = {}, page = 0) {
  try {
    const user = await getUser(userId);
    if (!user) return null;
    
    // Get users already liked (to exclude)
    const likedIds = await getLikedUserIds(userId);
    const excludeIds = [userId, ...likedIds];
    
    // Extract filters with defaults
    const {
      minAge = 18,
      maxAge = 99,
      location = null,
      universityOnly = false
    } = filters;
    
    let candidates = [];
    
    if (useSupabase) {
      // Supabase query
      let query = supabaseQuery('users', {
        neq: { banned: true },
        select: '*'
      });
      
      // Build complex query
      const { data } = await query;
      
      candidates = data.filter(u => {
        // Exclude already liked and self
        if (excludeIds.includes(u.tg_id)) return false;
        
        // Age filter
        if (u.age < minAge || u.age > maxAge) return false;
        
        // Location filter (if specified)
        if (location && u.location !== location) return false;
        
        // University filter
        if (universityOnly && !u.email_verified) return false;
        
        return true;
      });
    } else {
      // SQLite query
      const excludePlaceholders = excludeIds.map(() => '?').join(',');
      
      let sql = `
        SELECT * FROM users
        WHERE tg_id NOT IN (${excludePlaceholders})
        AND banned = 0
        AND age >= ?
        AND age <= ?
      `;
      
      const params = [...excludeIds, minAge, maxAge];
      
      if (location) {
        sql += ' AND location = ?';
        params.push(location);
      }
      
      if (universityOnly) {
        sql += ' AND email_verified = 1';
      }
      
      sql += ' ORDER BY created_at DESC';
      
      candidates = sqliteQuery(sql, params);
    }
    
    // Simple scoring: newer profiles ranked higher + randomization
    // TODO: Replace with ML-based scoring or Redis-cached ranked lists for scale
    candidates = candidates.map(c => ({
      ...c,
      score: Math.random() * 0.5 + (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365) // Random + recency
    }));
    
    candidates.sort((a, b) => b.score - a.score);
    
    // Pagination
    const offset = page * 1;
    const candidate = candidates[offset] || null;
    
    return candidate;
  } catch (error) {
    console.error('getNextCandidate error:', error);
    return null;
  }
}

/**
 * Get user preferences (stored in user record or separate table)
 * @param {number} userId - User's Telegram ID
 * @returns {Promise<object>} Preferences object
 */
export async function getUserPreferences(userId) {
  const user = await getUser(userId);
  
  if (!user) {
    return {
      minAge: 18,
      maxAge: 99,
      location: null,
      universityOnly: false
    };
  }
  
  // TODO: Store preferences in separate table for more complex filters
  return {
    minAge: user.pref_min_age || 18,
    maxAge: user.pref_max_age || 99,
    location: user.pref_location || null,
    universityOnly: user.pref_university_only || false
  };
}

/**
 * Update user preferences
 * @param {number} userId - User's Telegram ID
 * @param {object} preferences - Preference updates
 * @returns {Promise<object>} Updated user
 */
export async function updateUserPreferences(userId, preferences) {
  const { updateUser } = await import('./db.js');
  
  const updates = {};
  if (preferences.minAge !== undefined) updates.pref_min_age = preferences.minAge;
  if (preferences.maxAge !== undefined) updates.pref_max_age = preferences.maxAge;
  if (preferences.location !== undefined) updates.pref_location = preferences.location;
  if (preferences.universityOnly !== undefined) updates.pref_university_only = preferences.universityOnly;
  
  return await updateUser(userId, updates);
}
