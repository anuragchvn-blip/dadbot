/**
 * High-level database functions for DonutDot bot
 * Abstracts over Supabase and SQLite
 */

import {
  useSupabase,
  supabaseQuery,
  supabaseInsert,
  supabaseUpdate,
  sqliteQuery,
  sqliteGet,
  sqliteInsert,
  sqliteUpdate
} from './supabaseClient.js';

/**
 * Get user by Telegram ID
 * @param {number} tgId - Telegram chat ID
 * @returns {Promise<object|null>} User object or null
 */
export async function getUser(tgId) {
  try {
    if (useSupabase) {
      const users = await supabaseQuery('users', { eq: { tg_id: tgId } });
      return users.length > 0 ? users[0] : null;
    } else {
      return sqliteGet('users', 'tg_id', tgId) || null;
    }
  } catch (error) {
    console.error('getUser error:', error);
    return null;
  }
}

/**
 * Create or update user
 * @param {number} tgId - Telegram chat ID
 * @param {object} userData - User data fields
 * @returns {Promise<object>} Created/updated user
 */
export async function createOrUpdateUser(tgId, userData) {
  const existing = await getUser(tgId);
  const now = new Date().toISOString();
  
  const data = {
    tg_id: tgId,
    ...userData,
    updated_at: now,
    ...(existing ? {} : { created_at: now })
  };
  
  try {
    if (useSupabase) {
      if (existing) {
        return await supabaseUpdate('users', { tg_id: tgId }, data);
      } else {
        return await supabaseInsert('users', data);
      }
    } else {
      if (existing) {
        return sqliteUpdate('users', { tg_id: tgId }, data);
      } else {
        return sqliteInsert('users', data);
      }
    }
  } catch (error) {
    console.error('createOrUpdateUser error:', error);
    throw error;
  }
}

/**
 * Update user fields
 * @param {number} tgId - Telegram chat ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated user
 */
export async function updateUser(tgId, updates) {
  const data = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseUpdate('users', { tg_id: tgId }, data);
    } else {
      return sqliteUpdate('users', { tg_id: tgId }, data);
    }
  } catch (error) {
    console.error('updateUser error:', error);
    throw error;
  }
}

/**
 * Create a like from one user to another
 * @param {number} fromId - Liker's Telegram ID
 * @param {number} toId - Liked user's Telegram ID
 * @returns {Promise<object>} Like record
 */
export async function createLike(fromId, toId) {
  const data = {
    from_tg_id: fromId,
    to_tg_id: toId,
    created_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('likes', data);
    } else {
      return sqliteInsert('likes', data);
    }
  } catch (error) {
    console.error('createLike error:', error);
    throw error;
  }
}

/**
 * Check if a like exists
 * @param {number} fromId - Liker's Telegram ID
 * @param {number} toId - Liked user's Telegram ID
 * @returns {Promise<boolean>} True if like exists
 */
export async function hasLike(fromId, toId) {
  try {
    if (useSupabase) {
      const likes = await supabaseQuery('likes', {
        eq: { from_tg_id: fromId, to_tg_id: toId }
      });
      return likes.length > 0;
    } else {
      const result = sqliteQuery(
        'SELECT COUNT(*) as count FROM likes WHERE from_tg_id = ? AND to_tg_id = ?',
        [fromId, toId]
      );
      return result[0].count > 0;
    }
  } catch (error) {
    console.error('hasLike error:', error);
    return false;
  }
}

/**
 * Get mutual matches for a user
 * @param {number} tgId - User's Telegram ID
 * @returns {Promise<Array>} Array of match records
 */
export async function getMutualMatches(tgId) {
  try {
    if (useSupabase) {
      // Get matches where user is either user1 or user2
      const matches1 = await supabaseQuery('matches', { eq: { user1_tg_id: tgId } });
      const matches2 = await supabaseQuery('matches', { eq: { user2_tg_id: tgId } });
      return [...matches1, ...matches2];
    } else {
      return sqliteQuery(
        'SELECT * FROM matches WHERE user1_tg_id = ? OR user2_tg_id = ? ORDER BY created_at DESC',
        [tgId, tgId]
      );
    }
  } catch (error) {
    console.error('getMutualMatches error:', error);
    return [];
  }
}

/**
 * Create a match between two users
 * @param {number} user1Id - First user's Telegram ID
 * @param {number} user2Id - Second user's Telegram ID
 * @returns {Promise<object>} Match record
 */
export async function createMatch(user1Id, user2Id) {
  const data = {
    user1_tg_id: user1Id,
    user2_tg_id: user2Id,
    created_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('matches', data);
    } else {
      return sqliteInsert('matches', data);
    }
  } catch (error) {
    console.error('createMatch error:', error);
    throw error;
  }
}

/**
 * Create a daily pass for a user
 * @param {number} tgId - User's Telegram ID
 * @param {string} referenceId - Payment reference ID
 * @returns {Promise<object>} Pass record
 */
export async function createPassForUser(tgId, referenceId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parseInt(process.env.PASS_VALIDITY_HOURS || 24) * 60 * 60 * 1000);
  
  const data = {
    tg_id: tgId,
    reference_id: referenceId,
    purchased_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    used_at: null
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('passes', data);
    } else {
      return sqliteInsert('passes', data);
    }
  } catch (error) {
    console.error('createPassForUser error:', error);
    throw error;
  }
}

/**
 * Check if user has an active (unused, non-expired) pass
 * @param {number} tgId - User's Telegram ID
 * @returns {Promise<object|null>} Active pass or null
 */
export async function userHasActivePass(tgId) {
  const now = new Date().toISOString();
  
  try {
    if (useSupabase) {
      const passes = await supabaseQuery('passes', {
        eq: { tg_id: tgId, used_at: null }
      });
      
      // Filter for non-expired passes
      const activePasses = passes.filter(p => p.expires_at > now);
      return activePasses.length > 0 ? activePasses[0] : null;
    } else {
      const result = sqliteQuery(
        'SELECT * FROM passes WHERE tg_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY purchased_at ASC LIMIT 1',
        [tgId, now]
      );
      return result.length > 0 ? result[0] : null;
    }
  } catch (error) {
    console.error('userHasActivePass error:', error);
    return null;
  }
}

/**
 * Consume a user's active pass
 * @param {number} tgId - User's Telegram ID
 * @returns {Promise<object|null>} Consumed pass or null
 */
export async function consumePass(tgId) {
  const activePass = await userHasActivePass(tgId);
  
  if (!activePass) return null;
  
  const now = new Date().toISOString();
  
  try {
    if (useSupabase) {
      return await supabaseUpdate('passes', { id: activePass.id }, { used_at: now });
    } else {
      return sqliteUpdate('passes', { id: activePass.id }, { used_at: now });
    }
  } catch (error) {
    console.error('consumePass error:', error);
    return null;
  }
}

/**
 * Create a timed chat session
 * @param {number} user1Id - First user's Telegram ID
 * @param {number} user2Id - Second user's Telegram ID
 * @param {number} matchId - Match ID
 * @returns {Promise<object>} Chat session record
 */
export async function createChatSession(user1Id, user2Id, matchId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parseInt(process.env.PASS_DURATION_SECONDS || 120) * 1000);
  
  const data = {
    match_id: matchId,
    user1_tg_id: user1Id,
    user2_tg_id: user2Id,
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('chat_sessions', data);
    } else {
      return sqliteInsert('chat_sessions', data);
    }
  } catch (error) {
    console.error('createChatSession error:', error);
    throw error;
  }
}

/**
 * Create a Truth-or-Dare session
 * @param {number} user1Id - First user's Telegram ID (nullable for public pool)
 * @param {number} user2Id - Second user's Telegram ID (nullable initially)
 * @param {string} mode - 'match' or 'public'
 * @returns {Promise<object>} T/D session record
 */
export async function createTdSession(user1Id, user2Id, mode = 'match') {
  const now = new Date().toISOString();
  
  const data = {
    user1_tg_id: user1Id,
    user2_tg_id: user2Id,
    mode,
    status: 'active',
    user1_revealed: false,
    user2_revealed: false,
    created_at: now
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('td_sessions', data);
    } else {
      return sqliteInsert('td_sessions', data);
    }
  } catch (error) {
    console.error('createTdSession error:', error);
    throw error;
  }
}

/**
 * Relay a Truth-or-Dare message
 * @param {number} sessionId - T/D session ID
 * @param {number} fromTgId - Sender's Telegram ID
 * @param {string} message - Message text
 * @returns {Promise<object>} Message record
 */
export async function relayTdMessage(sessionId, fromTgId, message) {
  const data = {
    session_id: sessionId,
    from_tg_id: fromTgId,
    message,
    created_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('td_messages', data);
    } else {
      return sqliteInsert('td_messages', data);
    }
  } catch (error) {
    console.error('relayTdMessage error:', error);
    throw error;
  }
}

/**
 * Store email verification token
 * @param {number} tgId - User's Telegram ID
 * @param {string} email - Email address
 * @param {string} token - Verification token
 * @returns {Promise<object>} Token record
 */
export async function storeVerificationToken(tgId, email, token) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  const data = {
    tg_id: tgId,
    email,
    token,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('verification_tokens', data);
    } else {
      return sqliteInsert('verification_tokens', data);
    }
  } catch (error) {
    console.error('storeVerificationToken error:', error);
    throw error;
  }
}

/**
 * Verify email token and mark user as verified
 * @param {string} token - Verification token
 * @returns {Promise<object|null>} User object or null
 */
export async function verifyEmailToken(token) {
  const now = new Date().toISOString();
  
  try {
    let tokenRecord;
    
    if (useSupabase) {
      const tokens = await supabaseQuery('verification_tokens', { eq: { token } });
      tokenRecord = tokens.length > 0 ? tokens[0] : null;
    } else {
      const result = sqliteQuery('SELECT * FROM verification_tokens WHERE token = ?', [token]);
      tokenRecord = result.length > 0 ? result[0] : null;
    }
    
    if (!tokenRecord || tokenRecord.expires_at < now || tokenRecord.verified_at) {
      return null;
    }
    
    // Mark token as verified
    if (useSupabase) {
      await supabaseUpdate('verification_tokens', { id: tokenRecord.id }, { verified_at: now });
    } else {
      sqliteUpdate('verification_tokens', { id: tokenRecord.id }, { verified_at: now });
    }
    
    // Mark user as verified
    const user = await updateUser(tokenRecord.tg_id, {
      email_verified: true,
      verified_at: now,
      university: tokenRecord.email.split('@')[1] // Store domain as university
    });
    
    return user;
  } catch (error) {
    console.error('verifyEmailToken error:', error);
    return null;
  }
}

/**
 * Flag a report
 * @param {number} reporterTgId - Reporter's Telegram ID
 * @param {number} reportedTgId - Reported user's Telegram ID
 * @param {string} reason - Report reason
 * @returns {Promise<object>} Report record
 */
export async function flagReport(reporterTgId, reportedTgId, reason) {
  const data = {
    reporter_tg_id: reporterTgId,
    reported_tg_id: reportedTgId,
    reason,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  try {
    if (useSupabase) {
      return await supabaseInsert('reports', data);
    } else {
      return sqliteInsert('reports', data);
    }
  } catch (error) {
    console.error('flagReport error:', error);
    throw error;
  }
}

/**
 * Ban or unban a user
 * @param {number} tgId - User's Telegram ID
 * @param {boolean} banned - Ban status
 * @returns {Promise<object>} Updated user
 */
export async function banUser(tgId, banned = true) {
  return await updateUser(tgId, { banned });
}

/**
 * Get all reports with optional filter
 * @param {string} status - Filter by status ('pending', 'resolved', 'dismissed')
 * @returns {Promise<Array>} Array of report records
 */
export async function getReports(status = null) {
  try {
    if (useSupabase) {
      const options = status ? { eq: { status } } : {};
      return await supabaseQuery('reports', { ...options, order: { column: 'created_at', ascending: false } });
    } else {
      const sql = status
        ? 'SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC'
        : 'SELECT * FROM reports ORDER BY created_at DESC';
      const params = status ? [status] : [];
      return sqliteQuery(sql, params);
    }
  } catch (error) {
    console.error('getReports error:', error);
    return [];
  }
}

/**
 * Get liked user IDs for a user (for exclusion in matching)
 * @param {number} tgId - User's Telegram ID
 * @returns {Promise<Array<number>>} Array of liked user IDs
 */
export async function getLikedUserIds(tgId) {
  try {
    if (useSupabase) {
      const likes = await supabaseQuery('likes', { eq: { from_tg_id: tgId } });
      return likes.map(l => l.to_tg_id);
    } else {
      const result = sqliteQuery('SELECT to_tg_id FROM likes WHERE from_tg_id = ?', [tgId]);
      return result.map(r => r.to_tg_id);
    }
  } catch (error) {
    console.error('getLikedUserIds error:', error);
    return [];
  }
}
