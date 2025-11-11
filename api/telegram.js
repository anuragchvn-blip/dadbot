/**
 * Telegram webhook handler - Main bot logic
 * Handles all incoming messages and callback queries
 */

import {
  getUser,
  createOrUpdateUser,
  updateUser,
  createLike,
  hasLike,
  createMatch,
  userHasActivePass,
  consumePass,
  createChatSession,
  flagReport,
  getMutualMatches
} from '../lib/db.js';
import { getNextCandidate, getUserPreferences } from '../lib/matcher.js';
import { sendMessage, sendInlineKeyboard, answerCallbackQuery, editMessageText } from '../lib/telegram.js';
import { createPaymentLink } from '../lib/razorpay.js';

// In-memory state for onboarding flow
// TODO: Replace with Redis for production scalability
const onboardingState = new Map();

// Simple rate limiting (in-memory)
const rateLimits = new Map();

function checkRateLimit(chatId) {
  const now = Date.now();
  const lastAction = rateLimits.get(chatId) || 0;
  
  if (now - lastAction < 3000) { // 3 seconds
    return false;
  }
  
  rateLimits.set(chatId, now);
  return true;
}

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const update = req.body;
    
    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return res.status(200).json({ ok: true });
    }
    
    // Handle text messages
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      
      // Rate limiting
      if (!checkRateLimit(chatId)) {
        await sendMessage(chatId, '⏱️ Please wait a moment before the next action.');
        return res.status(200).json({ ok: true });
      }
      
      // Handle commands
      if (text.startsWith('/')) {
        await handleCommand(chatId, text, update.message);
      } else {
        // Handle onboarding flow responses
        await handleOnboardingResponse(chatId, text, update.message);
      }
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * Handle bot commands
 */
async function handleCommand(chatId, text, message) {
  const command = text.split(' ')[0].toLowerCase();
  
  switch (command) {
    case '/start':
      await handleStart(chatId, message);
      break;
    
    case '/profile':
      await handleProfile(chatId);
      break;
    
    case '/browse':
      await handleBrowse(chatId);
      break;
    
    case '/matches':
      await handleMatches(chatId);
      break;
    
    case '/pass':
      await handleBuyPass(chatId);
      break;
    
    case '/verify_email':
      await handleVerifyEmailStart(chatId);
      break;
    
    case '/help':
      await handleHelp(chatId);
      break;
    
    default:
      await sendMessage(chatId, 'Unknown command. Type /help for available commands.');
  }
}

/**
 * /start - Begin onboarding or welcome back
 */
async function handleStart(chatId, message) {
  const user = await getUser(chatId);
  
  if (user && user.name && user.age && user.location) {
    // User already onboarded
    await sendMessage(
      chatId,
      `👋 Welcome back, ${user.name}!\n\n` +
      `Use these commands:\n` +
      `/browse - Browse profiles\n` +
      `/matches - View your matches\n` +
      `/profile - Edit your profile\n` +
      `/pass - Buy a Daily Pass (₹30)\n` +
      `/verify_email - Verify university email`
    );
  } else {
    // Start onboarding
    onboardingState.set(chatId, { step: 'name' });
    await sendMessage(
      chatId,
      `🍩 Welcome to DonutDot!\n\n` +
      `Let's set up your profile. This is a text-only matchmaking bot.\n\n` +
      `First, what's your name?`
    );
  }
}

/**
 * Handle onboarding flow responses
 */
async function handleOnboardingResponse(chatId, text, message) {
  const state = onboardingState.get(chatId);
  
  if (!state) {
    // Not in onboarding flow
    await sendMessage(chatId, 'Please use a command. Type /help for available commands.');
    return;
  }
  
  try {
    switch (state.step) {
      case 'name':
        state.name = text;
        state.step = 'age';
        onboardingState.set(chatId, state);
        await sendMessage(chatId, `Nice to meet you, ${text}! 👋\n\nHow old are you?`);
        break;
      
      case 'age':
        const age = parseInt(text, 10);
        if (isNaN(age) || age < 18 || age > 100) {
          await sendMessage(chatId, 'Please enter a valid age (18-100).');
          return;
        }
        state.age = age;
        state.step = 'location';
        onboardingState.set(chatId, state);
        await sendMessage(chatId, `Got it! Where are you located? (City name)`);
        break;
      
      case 'location':
        state.location = text;
        
        // Create user with required fields
        await createOrUpdateUser(chatId, {
          name: state.name,
          age: state.age,
          location: state.location,
          email_verified: false,
          banned: false
        });
        
        onboardingState.delete(chatId);
        
        await sendMessage(
          chatId,
          `✅ Profile created!\n\n` +
          `You can now:\n` +
          `/browse - Start browsing profiles\n` +
          `/profile - Add bio or university\n` +
          `/pass - Buy Daily Pass for timed chats (₹30)\n` +
          `/verify_email - Verify university email for verified badge`
        );
        break;
      
      case 'edit_bio':
        await updateUser(chatId, { bio: text });
        onboardingState.delete(chatId);
        await sendMessage(chatId, '✅ Bio updated!');
        await handleProfile(chatId);
        break;
      
      case 'edit_university':
        await updateUser(chatId, { university: text });
        onboardingState.delete(chatId);
        await sendMessage(chatId, '✅ University updated!');
        await handleProfile(chatId);
        break;
      
      case 'verify_email':
        // TODO: Send verification email
        await sendMessage(chatId, 'Email verification coming soon! Use /profile to continue.');
        onboardingState.delete(chatId);
        break;
    }
  } catch (error) {
    console.error('Onboarding error:', error);
    onboardingState.delete(chatId);
    await sendMessage(chatId, '❌ An error occurred. Please try /start again.');
  }
}

/**
 * /profile - View and edit profile
 */
async function handleProfile(chatId) {
  const user = await getUser(chatId);
  
  if (!user) {
    await sendMessage(chatId, 'Please use /start to create your profile first.');
    return;
  }
  
  const verifiedBadge = user.email_verified ? '✅' : '';
  
  const profileText = `
👤 Your Profile ${verifiedBadge}

Name: ${user.name}
Age: ${user.age}
Location: ${user.location}
University: ${user.university || 'Not set'}
Bio: ${user.bio || 'Not set'}

${user.email_verified ? '✅ Email verified' : '❌ Email not verified'}
  `.trim();
  
  const keyboard = [
    [{ text: '✏️ Edit Bio', callback_data: 'edit_bio' }],
    [{ text: '🎓 Edit University', callback_data: 'edit_university' }],
    [{ text: '🔐 Verify Email', callback_data: 'verify_email_prompt' }]
  ];
  
  await sendInlineKeyboard(chatId, profileText, keyboard);
}

/**
 * /browse - Browse and like profiles
 */
async function handleBrowse(chatId) {
  const user = await getUser(chatId);
  
  if (!user) {
    await sendMessage(chatId, 'Please use /start to create your profile first.');
    return;
  }
  
  try {
    const preferences = await getUserPreferences(chatId);
    const candidate = await getNextCandidate(chatId, preferences);
    
    if (!candidate) {
      await sendMessage(
        chatId,
        `😔 No more profiles to show right now.\n\n` +
        `Check back later or adjust your preferences!`
      );
      return;
    }
    
    const verifiedBadge = candidate.email_verified ? '✅' : '';
    
    const profileText = `
🍩 Profile ${verifiedBadge}

${candidate.name}, ${candidate.age}
📍 ${candidate.location}
${candidate.university ? `🎓 ${candidate.university}` : ''}

${candidate.bio || 'No bio yet'}
    `.trim();
    
    const keyboard = [
      [
        { text: '❤️ Like', callback_data: `like_${candidate.tg_id}` },
        { text: '💤 Pass', callback_data: `pass_${candidate.tg_id}` }
      ],
      [
        { text: '🎭 Truth/Dare', callback_data: `td_${candidate.tg_id}` },
        { text: '🚫 Report', callback_data: `report_${candidate.tg_id}` }
      ],
      [{ text: '➡️ Next', callback_data: 'browse_next' }]
    ];
    
    await sendInlineKeyboard(chatId, profileText, keyboard);
  } catch (error) {
    console.error('Browse error:', error);
    await sendMessage(chatId, '❌ An error occurred. Please try again.');
  }
}

/**
 * /matches - View matches
 */
async function handleMatches(chatId) {
  try {
    const matches = await getMutualMatches(chatId);
    
    if (matches.length === 0) {
      await sendMessage(
        chatId,
        `💔 No matches yet.\n\n` +
        `Use /browse to start liking profiles!`
      );
      return;
    }
    
    let text = `💕 Your Matches (${matches.length}):\n\n`;
    
    for (const match of matches.slice(0, 10)) {
      const otherUserId = match.user1_tg_id === chatId ? match.user2_tg_id : match.user1_tg_id;
      const otherUser = await getUser(otherUserId);
      
      if (otherUser) {
        const verifiedBadge = otherUser.email_verified ? '✅' : '';
        text += `${verifiedBadge} ${otherUser.name}, ${otherUser.age} - ${otherUser.location}\n`;
      }
    }
    
    text += `\n💬 To start a timed chat, you need a Daily Pass!\nUse /pass to purchase one for ₹30.`;
    
    await sendMessage(chatId, text);
  } catch (error) {
    console.error('Matches error:', error);
    await sendMessage(chatId, '❌ An error occurred. Please try again.');
  }
}

/**
 * /pass - Buy Daily Pass
 */
async function handleBuyPass(chatId) {
  try {
    console.log(`[/pass] Creating payment link for chatId: ${chatId}`);
    const amountPaise = parseInt(process.env.DAILY_PASS_AMOUNT_PAISA || '3000', 10);
    console.log(`[/pass] Amount: ${amountPaise} paise`);
    
    const paymentLink = await createPaymentLink({
      tgId: chatId,
      amountPaise,
      description: 'DonutDot Daily Pass - 2 min timed chat'
    });
    
    console.log(`[/pass] Payment link created: ${paymentLink.short_url}`);
    
    await sendMessage(
      chatId,
      `💳 Daily Pass - ₹${amountPaise / 100}\n\n` +
      `Get one 2-minute timed chat session!\n\n` +
      `Click here to pay: ${paymentLink.short_url}\n\n` +
      `After payment, you'll be notified and can start chatting with your matches!`
    );
  } catch (error) {
    console.error('Buy pass error:', error);
    console.error('Error stack:', error.stack);
    await sendMessage(chatId, `❌ Failed to create payment link. Error: ${error.message}\nPlease try again later.`);
  }
}

/**
 * /verify_email - Start email verification
 */
async function handleVerifyEmailStart(chatId) {
  await sendMessage(
    chatId,
    `📧 Email Verification\n\n` +
    `To get a verified badge, send your university email address.\n\n` +
    `We'll send you a verification link.\n\n` +
    `Type your email or /cancel to cancel.`
  );
  
  onboardingState.set(chatId, { step: 'verify_email' });
}

/**
 * /help - Show help
 */
async function handleHelp(chatId) {
  await sendMessage(
    chatId,
    `🍩 DonutDot Bot (@DonutDot_bot) Commands:\n\n` +
    `/start - Start or restart\n` +
    `/profile - View/edit your profile\n` +
    `/browse - Browse profiles\n` +
    `/matches - View your matches\n` +
    `/pass - Buy Daily Pass (₹30)\n` +
    `/verify_email - Verify university email\n` +
    `/help - Show this help\n\n` +
    `How it works:\n` +
    `1. Browse profiles and Like or Pass\n` +
    `2. When you both Like each other = Match! 💕\n` +
    `3. Buy a Daily Pass to start a 2-min timed chat\n` +
    `4. Or play anonymous Truth/Dare 🎭`
  );
}

/**
 * Handle callback queries (button presses)
 */
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;
  
  try {
    // Like action
    if (data.startsWith('like_')) {
      const targetId = parseInt(data.split('_')[1], 10);
      await handleLike(chatId, targetId, callbackQuery.id, messageId);
    }
    // Pass action
    else if (data.startsWith('pass_')) {
      await answerCallbackQuery(callbackQuery.id, 'Passed!');
      await editMessageText(chatId, messageId, '💤 Passed. Use /browse to see the next profile.');
    }
    // Report action
    else if (data.startsWith('report_')) {
      const targetId = parseInt(data.split('_')[1], 10);
      await handleReport(chatId, targetId, callbackQuery.id, messageId);
    }
    // Truth/Dare action
    else if (data.startsWith('td_')) {
      const targetId = parseInt(data.split('_')[1], 10);
      await handleTruthDare(chatId, targetId, callbackQuery.id, messageId);
    }
    // Browse next
    else if (data === 'browse_next') {
      await answerCallbackQuery(callbackQuery.id);
      await handleBrowse(chatId);
    }
    // Edit bio
    else if (data === 'edit_bio') {
      await answerCallbackQuery(callbackQuery.id);
      onboardingState.set(chatId, { step: 'edit_bio' });
      await sendMessage(chatId, 'Send your new bio:');
    }
    // Edit university
    else if (data === 'edit_university') {
      await answerCallbackQuery(callbackQuery.id);
      onboardingState.set(chatId, { step: 'edit_university' });
      await sendMessage(chatId, 'Send your university name:');
    }
    // Verify email prompt
    else if (data === 'verify_email_prompt') {
      await answerCallbackQuery(callbackQuery.id);
      await handleVerifyEmailStart(chatId);
    }
  } catch (error) {
    console.error('Callback query error:', error);
    await answerCallbackQuery(callbackQuery.id, 'An error occurred', true);
  }
}

/**
 * Handle like action and check for mutual match
 */
async function handleLike(chatId, targetId, callbackQueryId, messageId) {
  try {
    // Create the like
    await createLike(chatId, targetId);
    
    // Check if mutual
    const isMutual = await hasLike(targetId, chatId);
    
    if (isMutual) {
      // It's a match!
      await answerCallbackQuery(callbackQueryId, '💕 It\'s a Match!', true);
      
      // Create match record
      const match = await createMatch(chatId, targetId);
      
      // Check if either user has an active pass
      const currentUserPass = await userHasActivePass(chatId);
      const targetUserPass = await userHasActivePass(targetId);
      
      if (currentUserPass || targetUserPass) {
        // Consume the pass of the initiating user (current user)
        const consumedPass = currentUserPass 
          ? await consumePass(chatId)
          : await consumePass(targetId);
        
        if (consumedPass) {
          // Create chat session
          const session = await createChatSession(chatId, targetId, match.id);
          
          const currentUser = await getUser(chatId);
          const targetUser = await getUser(targetId);
          
          // Notify both users
          const durationSec = parseInt(process.env.PASS_DURATION_SECONDS || '120', 10);
          
          await sendMessage(
            chatId,
            `🎉 It's a Match with ${targetUser.name}!\n\n` +
            `💬 Your ${durationSec}s timed chat has started!\n` +
            `Chat with: @${targetUser.username || `user_${targetId}`}\n\n` +
            `⏰ Session expires at: ${new Date(session.expires_at).toLocaleTimeString()}`
          );
          
          await sendMessage(
            targetId,
            `🎉 It's a Match with ${currentUser.name}!\n\n` +
            `💬 A ${durationSec}s timed chat has started!\n` +
            `Chat with: @${currentUser.username || `user_${chatId}`}\n\n` +
            `⏰ Session expires at: ${new Date(session.expires_at).toLocaleTimeString()}`
          );
        }
      } else {
        // No pass available
        const currentUser = await getUser(chatId);
        const targetUser = await getUser(targetId);
        
        await sendMessage(
          chatId,
          `🎉 It's a Match with ${targetUser.name}!\n\n` +
          `To start a timed chat, buy a Daily Pass:\n` +
          `/pass`
        );
        
        await sendMessage(
          targetId,
          `🎉 You matched with ${currentUser.name}!\n\n` +
          `To start a timed chat, buy a Daily Pass:\n` +
          `/pass`
        );
      }
      
      await editMessageText(chatId, messageId, '💕 It\'s a Match! Check /matches');
    } else {
      // Just liked, waiting for mutual
      await answerCallbackQuery(callbackQueryId, 'Liked! ❤️');
      await editMessageText(chatId, messageId, '❤️ Liked! Use /browse to see more profiles.');
    }
  } catch (error) {
    console.error('Like handler error:', error);
    await answerCallbackQuery(callbackQueryId, 'An error occurred', true);
  }
}

/**
 * Handle report action
 */
async function handleReport(chatId, targetId, callbackQueryId, messageId) {
  try {
    await flagReport(chatId, targetId, 'Reported from browse');
    await answerCallbackQuery(callbackQueryId, 'Reported. Thank you.', true);
    await editMessageText(chatId, messageId, '🚫 Reported. Use /browse to continue.');
  } catch (error) {
    console.error('Report handler error:', error);
    await answerCallbackQuery(callbackQueryId, 'An error occurred', true);
  }
}

/**
 * Handle Truth/Dare invitation
 * TODO: Implement full T/D flow with session management
 */
async function handleTruthDare(chatId, targetId, callbackQueryId, messageId) {
  try {
    await answerCallbackQuery(callbackQueryId, 'Truth/Dare coming soon!', true);
    await editMessageText(
      chatId,
      messageId,
      '🎭 Truth/Dare feature coming soon!\n\nUse /browse to continue.'
    );
  } catch (error) {
    console.error('Truth/Dare handler error:', error);
    await answerCallbackQuery(callbackQueryId, 'An error occurred', true);
  }
}
