/**
 * Telegram Bot API helper functions
 * Wrapper around Telegram HTTP API
 */

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

/**
 * Send a text message
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @param {object} options - Additional options (parse_mode, reply_markup, etc.)
 * @returns {Promise<object>} API response
 */
export async function sendMessage(chatId, text, options = {}) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
    }
    
    return data;
  } catch (error) {
    console.error('sendMessage error:', error);
    throw error;
  }
}

/**
 * Send a message with inline keyboard
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text
 * @param {object|Array} keyboard - Keyboard object or array of button rows
 * @returns {Promise<object>} API response
 */
export async function sendInlineKeyboard(chatId, text, keyboard) {
  // If keyboard is an object with inline_keyboard property, use it directly
  // Otherwise, wrap it
  const replyMarkup = keyboard.inline_keyboard ? keyboard : { inline_keyboard: keyboard };
  
  return await sendMessage(chatId, text, {
    reply_markup: replyMarkup,
    parse_mode: 'Markdown'
  });
}

/**
 * Answer a callback query (from inline button press)
 * @param {string} callbackQueryId - Callback query ID
 * @param {string} text - Optional text to show
 * @param {boolean} showAlert - Show as alert vs toast
 * @returns {Promise<object>} API response
 */
export async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('answerCallbackQuery error:', error);
    throw error;
  }
}

/**
 * Edit message text (used to update inline keyboard messages)
 * @param {number} chatId - Telegram chat ID
 * @param {number} messageId - Message ID to edit
 * @param {string} text - New text
 * @param {object} options - Additional options
 * @returns {Promise<object>} API response
 */
export async function editMessageText(chatId, messageId, text, options = {}) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        ...options
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('editMessageText error:', error);
    throw error;
  }
}

/**
 * Create a temporary chat invite link
 * NOTE: This requires bot to be admin in a group/channel.
 * For 1-on-1 matching, we can't programmatically create groups.
 * Instead, we send both users each other's @username.
 * 
 * @param {number} chatId - Group chat ID (not user chat)
 * @param {number} expireDate - Unix timestamp
 * @param {number} memberLimit - Max members
 * @returns {Promise<object>} API response with invite_link
 */
export async function createTemporaryChatInvite(chatId, expireDate, memberLimit = 2) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        expire_date: expireDate,
        member_limit: memberLimit
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('createTemporaryChatInvite error:', error);
    throw error;
  }
}

/**
 * Get user profile photos
 * @param {number} userId - Telegram user ID
 * @returns {Promise<object>} API response
 */
export async function getUserProfilePhotos(userId) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getUserProfilePhotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        limit: 1
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('getUserProfilePhotos error:', error);
    throw error;
  }
}

/**
 * Set webhook URL
 * @param {string} url - Webhook URL
 * @returns {Promise<object>} API response
 */
export async function setWebhook(url) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('setWebhook error:', error);
    throw error;
  }
}

/**
 * NOTES ON TELEGRAM LIMITATIONS:
 * 
 * 1. Bots cannot add users to groups directly. We can:
 *    - Send both users each other's @username (if public)
 *    - Create a group manually and add bot as admin, then send invite links
 *    - Use Telegram's start parameter deep linking
 * 
 * 2. For timed chat sessions, we recommend:
 *    - Send both users a message: "You matched! Chat with @username for 2 minutes"
 *    - Use a background worker to send expiry notifications
 *    - For better UX, consider using a mini-app or web-based chat
 * 
 * 3. The bot can only send messages to users who have started a conversation with it
 */

export { TELEGRAM_API_BASE };
