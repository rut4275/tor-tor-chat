const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Default settings
const DEFAULT_SETTINGS = {
  "webhookUrl": "https://api.example.com/webhook",
  "chatWebhookUrl": "https://api.example.com/chat",
  "settingsWebhookUrl": "https://api.example.com/settings",
  "summaryWebhookUrl": "https://api.example.com/summary",
  "openaiApiKey": "",
  "products": ["מוצר 1", "מוצר 2", "מוצר 3"],
  "primaryColor": "#2563eb",
  "secondaryColor": "#6b7280",
  "textColor": "#1f2937",
  "backgroundColor": "#ffffff",
  "fontFamily": "system-ui, -apple-system, sans-serif",
  "fontSize": "14px",
  "welcomeMessage": "שלום! איך אני יכול לעזור לך היום?",
  "chatTitle": "צ'אטבוט",
  "chatIcon": "💬",
  "botName": "עוזר",
  "userPlaceholder": "הקלד הודעה...",
  "collectName": true,
  "collectPhone": true,
  "collectProduct": true,
  "nameLabel": "מה השם שלך?",
  "phoneLabel": "מה מספר הטלפון שלך?",
  "productLabel": "איזה מוצר מעניין אותך?"
};

// In-memory storage
let settings = { ...DEFAULT_SETTINGS };
let conversations = {};

// Settings endpoints
app.get('/api/settings', (req, res) => {
  console.log(`[DEBUG] GET /api/settings - Request received from ${req.ip}`);
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  console.log(`[DEBUG] POST /api/settings - Request received from ${req.ip}`);
  try {
    const newSettings = req.body;
    console.log(`[DEBUG] Settings update data:`, newSettings);
    
    if (!newSettings) {
      console.log("[DEBUG] No settings provided in request");
      return res.status(400).json({ error: "No settings provided" });
    }
    
    // Update settings
    settings = { ...settings, ...newSettings };
    console.log(`[DEBUG] Settings updated successfully:`, settings);
    
    res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.log(`[DEBUG] Error updating settings:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/reset', (req, res) => {
  console.log(`[DEBUG] POST /api/settings/reset - Request received from ${req.ip}`);
  settings = { ...DEFAULT_SETTINGS };
  console.log(`[DEBUG] Settings reset to default:`, settings);
  res.json({ message: "Settings reset successfully", settings });
});

// Chat endpoints
app.post('/api/chat/send', async (req, res) => {
  console.log(`[DEBUG] POST /api/chat/send - Request received from ${req.ip}`);
  try {
    const { message, conversationId } = req.body;
    console.log(`[DEBUG] Chat request - Message: '${message}', Conversation ID: ${conversationId}`);
    
    if (!message) {
      console.log("[DEBUG] No message provided in request");
      return res.status(400).json({ error: "Message is required" });
    }
    
    if (!settings.openaiApiKey) {
      console.log("[DEBUG] OpenAI API key not configured");
      return res.status(400).json({ error: "OpenAI API key not configured" });
    }
    
    // Initialize conversation if not exists
    if (!conversations[conversationId]) {
      console.log(`[DEBUG] Creating new conversation: ${conversationId}`);
      conversations[conversationId] = {
        messages: [],
        created_at: new Date().toISOString()
      };
    }
    
    // Add user message to conversation
    conversations[conversationId].messages.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString()
    });
    console.log(`[DEBUG] Added user message to conversation ${conversationId}`);
    
    // Prepare OpenAI request
    const openaiMessages = [
      { role: "system", content: `אתה עוזר וירטואלי בשם ${settings.botName || 'עוזר'}. ענה בעברית בצורה ידידותית ומועילה.` }
    ];
    
    // Add conversation history
    for (const msg of conversations[conversationId].messages) {
      openaiMessages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    console.log(`[DEBUG] BEFORE OpenAI API call - Messages count: ${openaiMessages.length}`);
    console.log(`[DEBUG] OpenAI request payload:`, openaiMessages);
    
    // Call OpenAI API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    console.log(`[DEBUG] AFTER OpenAI API call - Response received successfully`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`[DEBUG] OpenAI API error:`, errorData);
      
      if (response.status === 401) {
        console.log("[DEBUG] OpenAI Authentication Error - Invalid API key");
        return res.status(401).json({ error: "מפתח OpenAI לא תקין" });
      } else if (response.status === 429) {
        console.log("[DEBUG] OpenAI Rate Limit Error");
        return res.status(429).json({ error: "חרגת ממגבלת הקריאות ל-OpenAI" });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log(`[DEBUG] OpenAI response: '${aiResponse}'`);
    
    // Add AI response to conversation
    conversations[conversationId].messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString()
    });
    console.log(`[DEBUG] Added AI response to conversation ${conversationId}`);
    
    res.json({
      response: aiResponse,
      conversationId
    });
    
  } catch (error) {
    console.log(`[DEBUG] Error in OpenAI request:`, error.message);
    res.status(500).json({ error: `שגיאה בשליחה ל-OpenAI: ${error.message}` });
  }
});

// Lead submission
app.post('/api/lead/submit', async (req, res) => {
  console.log(`[DEBUG] POST /api/lead/submit - Request received from ${req.ip}`);
  try {
    const leadData = req.body;
    const { conversationId } = leadData;
    console.log(`[DEBUG] Lead submission - Conversation ID: ${conversationId}`);
    console.log(`[DEBUG] Lead data:`, leadData);
    
    if (!leadData) {
      console.log("[DEBUG] No lead data provided in request");
      return res.status(400).json({ error: "Lead data is required" });
    }
    
    // Add conversation history to lead data
    if (conversationId && conversations[conversationId]) {
      leadData.conversation = conversations[conversationId];
      console.log(`[DEBUG] Added conversation history to lead data`);
    }
    
    // Add timestamp
    leadData.submitted_at = new Date().toISOString();
    
    // Send to webhook if configured
    const webhookUrl = settings.webhookUrl;
    console.log(`[DEBUG] Webhook URL: ${webhookUrl}`);
    
    if (webhookUrl && webhookUrl !== "https://api.example.com/webhook") {
      console.log(`[DEBUG] BEFORE webhook call to: ${webhookUrl}`);
      console.log(`[DEBUG] Webhook payload:`, leadData);
      
      try {
        const fetch = (await import('node-fetch')).default;
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
          timeout: 30000
        });
        
        console.log(`[DEBUG] AFTER webhook call - Status code: ${webhookResponse.status}`);
        const responseText = await webhookResponse.text();
        console.log(`[DEBUG] Webhook response: ${responseText}`);
        
        if (webhookResponse.ok) {
          // Clean up conversation after successful submission
          if (conversationId && conversations[conversationId]) {
            delete conversations[conversationId];
            console.log(`[DEBUG] Cleaned up conversation ${conversationId}`);
          }
          
          return res.json({
            message: "Lead submitted successfully",
            webhook_status: "success"
          });
        } else {
          console.log(`[DEBUG] Webhook failed with status: ${webhookResponse.status}`);
          return res.json({
            message: "Lead received but webhook failed",
            webhook_status: "failed",
            webhook_error: `Status code: ${webhookResponse.status}`
          });
        }
        
      } catch (error) {
        console.log(`[DEBUG] Webhook request exception:`, error.message);
        return res.json({
          message: "Lead received but webhook failed",
          webhook_status: "failed",
          webhook_error: error.message
        });
      }
    } else {
      console.log("[DEBUG] No webhook configured or using default URL");
      return res.json({
        message: "Lead received (no webhook configured)",
        webhook_status: "no_webhook"
      });
    }
    
  } catch (error) {
    console.log(`[DEBUG] Error in lead submission:`, error.message);
    res.status(500).json({ error: `שגיאה בשליחת הליד: ${error.message}` });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  console.log(`[DEBUG] GET /api/health - Request received from ${req.ip}`);
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    settings_configured: !!settings.openaiApiKey
  });
});

// Get conversations (for debugging)
app.get('/api/conversations', (req, res) => {
  console.log(`[DEBUG] GET /api/conversations - Request received from ${req.ip}`);
  console.log(`[DEBUG] Active conversations:`, Object.keys(conversations));
  res.json({
    active_conversations: Object.keys(conversations).length,
    conversations: Object.keys(conversations)
  });
});

const port = process.env.PORT || 5000;
console.log(`Starting server on port ${port}`);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});