const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const { BotFrameworkAdapter, CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration, MemoryStorage, ConversationState, ActivityHandler } = require('botbuilder');
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
  MicrosoftAppType: process.env.MicrosoftAppType,
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

const adapter = new CloudAdapter(botFrameworkAuthentication);

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
  try {
    const prompt = `Given the following JSON data about a company:

${JSON.stringify(documentContent, null, 2)}

Please answer the following question:
${question}

Provide a concise and accurate answer based only on the information given in the JSON data. If the information is not available in the data, please respond with "I'm sorry, I don't have that information in the provided data."`;

    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      n: 1,
      temperature: 0.5,
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return "I'm sorry, I encountered an error while processing your question. Please try again later.";
  }
}

// Create bot
class DocumentQABot extends ActivityHandler {
  constructor(conversationState) {
    super();
    this.conversationState = conversationState;

    this.onMessage(async (context, next) => {
      console.log("Received message:", context.activity.text);
      const question = context.activity.text;
      const answer = await generateResponse(question);
      console.log("Sending answer:", answer);
      await context.sendActivity(answer);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity("Welcome! I'm a document Q&A bot powered by GPT-4. Ask me questions about our company.");
        }
      }
      await next();
    });
  }

  async run(context) {
    await super.run(context);
    await this.conversationState.saveChanges(context);
  }
}

// Create bot instance
const bot = new DocumentQABot(conversationState);

// Create server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
});

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});
