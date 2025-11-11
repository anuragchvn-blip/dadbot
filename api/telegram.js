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
import { AI_GIRL, getAIResponse, simulateTyping } from '../lib/aiGirl.js';

// In-memory state for onboarding flow
// TODO: Replace with Redis for production scalability
const onboardingState = new Map();

// Track AI girl chat sessions
// Structure: { chatId: { messageCount: 0, startTime: timestamp, sessionId: id } }
const aiChatSessions = new Map();

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
        // Check if user is in active AI chat session
        const handledByAI = await handleAIChatMessage(chatId, text);
        
        if (!handledByAI) {
          // Handle onboarding flow responses
          await handleOnboardingResponse(chatId, text, update.message);
        }
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
 * Show main menu with inline buttons
 */
async function showMainMenu(chatId, name = 'there') {
  const menuButtons = {
    inline_keyboard: [
      [
        { text: '🔍 Browse Profiles', callback_data: 'menu_browse' },
        { text: '💕 My Matches', callback_data: 'menu_matches' }
      ],
      [
        { text: '👤 My Profile', callback_data: 'menu_profile' },
        { text: '💳 Buy Pass (₹30)', callback_data: 'menu_pass' }
      ],
      [
        { text: '❓ Help', callback_data: 'menu_help' }
      ]
    ]
  };
  
  await sendInlineKeyboard(
    chatId,
    `👋 Welcome back, ${name}!\n\nWhat would you like to do?`,
    menuButtons
  );
}

/**
 * /start - Begin onboarding or welcome back
 */
async function handleStart(chatId, message) {
  const user = await getUser(chatId);
  
  if (user && user.name && user.age && user.location) {
    // User already onboarded - show menu
    await showMainMenu(chatId, user.name);
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
        state.step = 'gender';
        onboardingState.set(chatId, state);
        
        // Ask for gender with buttons
        const genderButtons = {
          inline_keyboard: [
            [
              { text: '👨 Male', callback_data: 'gender_male' },
              { text: '👩 Female', callback_data: 'gender_female' }
            ]
          ]
        };
        
        await sendInlineKeyboard(
          chatId,
          `What's your gender?`,
          genderButtons
        );
        break;
      
      case 'preference':
        // This is handled via callback buttons
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
  const backButton = {
    inline_keyboard: [[
      { text: '🏠 Back to Menu', callback_data: 'back_to_menu' }
    ]]
  };
  
  await sendInlineKeyboard(
    chatId,
    `🍩 *DonutDot Bot Guide*\n\n` +
    `*How it works:*\n` +
    `1️⃣ Browse profiles using the menu\n` +
    `2️⃣ Like or Pass on profiles\n` +
    `3️⃣ When you both Like = Match! 💕\n` +
    `4️⃣ Get 3 free minutes to chat\n` +
    `5️⃣ Buy Daily Pass (₹30) to continue chatting\n\n` +
    `*Features:*\n` +
    `• Text-only matchmaking\n` +
    `• Timed chat sessions\n` +
    `• Anonymous Truth/Dare 🎭\n` +
    `• University email verification\n\n` +
    `Use the menu buttons or type /start`,
    backButton
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
    // Buy Daily Pass
    else if (data === 'buy_pass') {
      await answerCallbackQuery(callbackQuery.id);
      await handleBuyPass(chatId);
    }
    // Main menu actions
    else if (data === 'menu_browse') {
      await answerCallbackQuery(callbackQuery.id);
      await handleBrowse(chatId);
    }
    else if (data === 'menu_matches') {
      await answerCallbackQuery(callbackQuery.id);
      await handleMatches(chatId);
    }
    else if (data === 'menu_profile') {
      await answerCallbackQuery(callbackQuery.id);
      await handleProfile(chatId);
    }
    else if (data === 'menu_pass') {
      await answerCallbackQuery(callbackQuery.id);
      await handleBuyPass(chatId);
    }
    else if (data === 'menu_help') {
      await answerCallbackQuery(callbackQuery.id);
      await handleHelp(chatId);
    }
    else if (data === 'back_to_menu') {
      await answerCallbackQuery(callbackQuery.id);
      const user = await getUser(chatId);
      await showMainMenu(chatId, user?.name || 'there');
    }
    // Gender selection
    else if (data.startsWith('gender_')) {
      const gender = data.split('_')[1]; // 'male' or 'female'
      await answerCallbackQuery(callbackQuery.id);
      
      const state = onboardingState.get(chatId);
      if (state) {
        state.gender = gender;
        state.step = 'preference';
        onboardingState.set(chatId, state);
        
        // Ask for preference
        const preferenceButtons = {
          inline_keyboard: [
            [
              { text: '👩 Connect with Girls', callback_data: 'pref_female' },
              { text: '👨 Connect with Boys', callback_data: 'pref_male' }
            ],
            [
              { text: '🌈 Everyone', callback_data: 'pref_both' }
            ]
          ]
        };
        
        await sendInlineKeyboard(
          chatId,
          `Who would you like to connect with?`,
          preferenceButtons
        );
      }
    }
    // Preference selection
    else if (data.startsWith('pref_')) {
      const preference = data.split('_')[1]; // 'male', 'female', or 'both'
      await answerCallbackQuery(callbackQuery.id);
      
      const state = onboardingState.get(chatId);
      if (state) {
        state.preference = preference;
        
        // Create user with all fields
        await createOrUpdateUser(chatId, {
          name: state.name,
          age: state.age,
          location: state.location,
          gender: state.gender,
          looking_for: preference,
          email_verified: false,
          banned: false
        });
        
        onboardingState.delete(chatId);
        
        await sendMessage(
          chatId,
          `✅ Profile created successfully!\n\n` +
          `Welcome to DonutDot, ${state.name}! 🎉`
        );
        
        // Auto-match based on preference
        if (preference === 'female' || preference === 'both') {
          await sendMessage(chatId, `🎁 Great news! You have an instant match!`);
          await startAIChat(chatId, state.name);
        } else {
          // Show main menu if looking for males only (no AI match)
          await showMainMenu(chatId, state.name);
        }
      }
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
        // No pass available - show button to buy pass
        const currentUser = await getUser(chatId);
        const targetUser = await getUser(targetId);
        
        const passButton = {
          inline_keyboard: [[
            { text: '💳 Buy Daily Pass (₹30)', callback_data: 'buy_pass' }
          ]]
        };
        
        await sendInlineKeyboard(
          chatId,
          `🎉 It's a Match with ${targetUser.name}!\n\n` +
          `To start a 3-minute timed chat, get a Daily Pass:`,
          passButton
        );
        
        await sendInlineKeyboard(
          targetId,
          `🎉 You matched with ${currentUser.name}!\n\n` +
          `To start a 3-minute timed chat, get a Daily Pass:`,
          passButton
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

/**
 * Start AI girl chat session
 */
async function startAIChat(chatId, userName) {
  const now = Date.now();
  const sessionId = `ai_${chatId}_${now}`;
  
  // Initialize AI chat session
  aiChatSessions.set(chatId, {
    messageCount: 0,
    startTime: now,
    sessionId: sessionId,
    timeLimit: 180000, // 3 minutes in milliseconds
    hasWarned: false
  });
  
  // Send match notification
  await sendMessage(
    chatId,
    `🎉 It's a Match with ${AI_GIRL.name}!\n\n` +
    `💬 Your 3-minute free chat has started!\n\n` +
    `Chat directly here - she'll respond to your messages!\n\n` +
    `⏰ After 3 minutes, you can buy Daily Pass (₹30) to continue chatting.`
  );
  
  // AI girl sends first message
  await simulateTyping();
  const firstMessage = getAIResponse('', 0, 180);
  await sendMessage(chatId, `💬 ${AI_GIRL.name}: ${firstMessage}`);
}

/**
 * Handle AI girl chat messages
 */
async function handleAIChatMessage(chatId, userMessage) {
  const session = aiChatSessions.get(chatId);
  
  if (!session) {
    return false; // No active AI session
  }
  
  const elapsed = Date.now() - session.startTime;
  const timeLeft = Math.floor((session.timeLimit - elapsed) / 1000);
  
  // Check if session expired
  if (elapsed >= session.timeLimit) {
    aiChatSessions.delete(chatId);
    
    const passButton = {
      inline_keyboard: [[
        { text: '💳 Buy Daily Pass (₹30) - Continue Chat', callback_data: 'buy_pass' }
      ], [
        { text: '🏠 Back to Menu', callback_data: 'back_to_menu' }
      ]]
    };
    
    await sendInlineKeyboard(
      chatId,
      `⏰ Your 3-minute free chat has ended!\n\n` +
      `Want to continue chatting with ${AI_GIRL.name}?\n\n` +
      `Get a Daily Pass for ₹30 and keep the conversation going! 💕`,
      passButton
    );
    
    return true;
  }
  
  // Warn at 30 seconds remaining
  if (timeLeft <= 30 && !session.hasWarned) {
    session.hasWarned = true;
    await sendMessage(chatId, `⏰ 30 seconds left in your free chat!`);
  }
  
  // Generate AI response
  await simulateTyping();
  const response = getAIResponse(userMessage, session.messageCount, timeLeft);
  session.messageCount++;
  
  await sendMessage(chatId, `💬 ${AI_GIRL.name}: ${response}`);
  
  return true;
}

