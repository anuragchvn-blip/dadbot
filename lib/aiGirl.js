/**
 * AI Girl Bot - Simulates a real girl chatting with users
 * Helps retain users and demonstrates the chat feature
 */

// AI Girl profile
export const AI_GIRL = {
  tg_id: 999999999, // Fake ID that won't conflict
  name: 'Priya',
  age: 21,
  location: 'Mumbai',
  university: 'Mumbai University',
  bio: 'Love coffee, books, and deep conversations ☕📚 Looking for genuine connections!',
  gender: 'female',
  email_verified: true,
  is_ai: true
};

// Conversation patterns - realistic responses
const CONVERSATION_PATTERNS = {
  greetings: [
    "Hey! 👋 How's your day going?",
    "Hi there! 😊",
    "Hello! Nice to match with you!",
    "Hey! Finally someone interesting 😄"
  ],
  
  responses: {
    // When user asks about her
    about: [
      "I'm studying psychology, love understanding how people think! What about you?",
      "I'm into art and music. Do you have any hobbies?",
      "I work as a content writer. It's fun! What do you do?",
      "Just finished my exams, finally some free time! 😅"
    ],
    
    // General conversation
    general: [
      "That's interesting! Tell me more 😊",
      "Really? That sounds cool!",
      "Oh wow, I'd love to know more about that",
      "Haha, that's funny! 😄",
      "I can relate to that so much!",
      "That's a unique perspective!",
      "Omg yes! I totally get that feeling",
      "Never thought of it that way before"
    ],
    
    // When time is running out
    timeWarning: [
      "This is fun! Time's flying by 😊",
      "I'm really enjoying talking to you!",
      "You seem like a genuinely nice person",
      "This conversation is going great!"
    ],
    
    // When asking questions
    questions: [
      "So what brings you here? Looking for friends or something more?",
      "What's the most interesting thing that happened to you this week?",
      "If you could travel anywhere right now, where would you go?",
      "What kind of music are you into?",
      "Are you more of a morning person or night owl?",
      "What's your favorite way to spend weekends?",
      "Do you believe in love at first chat? 😄",
      "What's something you're really passionate about?"
    ]
  }
};

/**
 * Get AI girl's response based on user message
 * @param {string} userMessage - User's message
 * @param {number} messageCount - Number of messages exchanged
 * @param {number} timeLeft - Seconds left in session
 * @returns {string} AI response
 */
export function getAIResponse(userMessage, messageCount, timeLeft) {
  const msg = userMessage.toLowerCase();
  
  // First message - greeting
  if (messageCount === 0) {
    return getRandomItem(CONVERSATION_PATTERNS.greetings);
  }
  
  // Time warning (last 30 seconds)
  if (timeLeft <= 30 && timeLeft > 20) {
    return getRandomItem(CONVERSATION_PATTERNS.responses.timeWarning);
  }
  
  // Check for specific keywords
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
    return "Hey! 😊 " + getRandomItem(CONVERSATION_PATTERNS.responses.questions);
  }
  
  if (msg.includes('how are you') || msg.includes('what about you') || msg.includes('and you')) {
    return getRandomItem(CONVERSATION_PATTERNS.responses.about);
  }
  
  if (msg.includes('name')) {
    return "I'm Priya! And you are? 😊";
  }
  
  if (msg.includes('age')) {
    return "I'm 21! What about you?";
  }
  
  if (msg.includes('where') || msg.includes('location') || msg.includes('city')) {
    return "I'm from Mumbai! Where are you from?";
  }
  
  if (msg.includes('?')) {
    // User asked a question, give relevant response
    return getRandomItem(CONVERSATION_PATTERNS.responses.general) + " " + getRandomItem(CONVERSATION_PATTERNS.responses.questions);
  }
  
  // Every 3rd message, ask a question to keep conversation going
  if (messageCount % 3 === 0) {
    return getRandomItem(CONVERSATION_PATTERNS.responses.general) + " " + getRandomItem(CONVERSATION_PATTERNS.responses.questions);
  }
  
  // Default: general response
  return getRandomItem(CONVERSATION_PATTERNS.responses.general);
}

/**
 * Get a random item from array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Simulate typing delay (make it seem human)
 * @returns {Promise} Resolves after random delay (1-3 seconds)
 */
export function simulateTyping() {
  const delay = 1000 + Math.random() * 2000; // 1-3 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
}
