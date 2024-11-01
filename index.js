const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, ActivityHandler } = require('botbuilder');
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword
});

// Create conversation state
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Load JSON document
const documentContent = JSON.parse(fs.readFileSync('document.json', 'utf8'));

// Function to generate response using GPT-4
async function generateResponse(question) {
  // ... (keep the existing function implementation)
}

// Create bot
class DocumentQABot extends ActivityHandler {
  // ... (keep the existing class implementation)
}

// Create bot instance
const bot = new DocumentQABot(conversationState);

// Create server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
});

// Listen for incoming requests
server.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});
