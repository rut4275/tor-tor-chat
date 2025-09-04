from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Default settings
DEFAULT_SETTINGS = {
    "webhookUrl": "https://api.example.com/webhook",
    "openaiApiKey": str(os.environ.get("openaiApiKey")),
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
    "userPlaceholder": "הקלד הודעה..."
}

# In-memory storage (in production, use a database)
settings = DEFAULT_SETTINGS.copy()
conversations = {}

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current settings"""
    print(f"[DEBUG] GET /api/settings - Request received from {request.remote_addr}")
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update settings"""
    global settings
    print(f"[DEBUG] POST /api/settings - Request received from {request.remote_addr}")
    try:
        new_settings = request.json
        print(f"[DEBUG] Settings update data: {new_settings}")
        if not new_settings:
            print("[DEBUG] No settings provided in request")
            return jsonify({"error": "No settings provided"}), 400
        
        # Update settings
        settings.update(new_settings)
        print(f"[DEBUG] Settings updated successfully: {settings}")
        
        return jsonify({"message": "Settings updated successfully", "settings": settings})
    except Exception as e:
        print(f"[DEBUG] Error updating settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings/reset', methods=['POST'])
def reset_settings():
    """Reset settings to default"""
    global settings
    print(f"[DEBUG] POST /api/settings/reset - Request received from {request.remote_addr}")
    settings = DEFAULT_SETTINGS.copy()
    print(f"[DEBUG] Settings reset to default: {settings}")
    return jsonify({"message": "Settings reset successfully", "settings": settings})

@app.route('/api/chat/send', methods=['POST'])
def send_to_openai():
    """Send message to OpenAI and return response"""
    print(f"[DEBUG] POST /api/chat/send - Request received from {request.remote_addr}")
    try:
        data = request.json
        message = data.get('message')
        conversation_id = data.get('conversationId')
        print(f"[DEBUG] Chat request - Message: '{message}', Conversation ID: {conversation_id}")
        
        if not message:
            print("[DEBUG] No message provided in request")
            return jsonify({"error": "Message is required"}), 400
        
        if not settings.get('openaiApiKey'):
            print("[DEBUG] OpenAI API key not configured")
            return jsonify({"error": "OpenAI API key not configured"}), 400
        
        # Initialize conversation if not exists
        if conversation_id not in conversations:
            print(f"[DEBUG] Creating new conversation: {conversation_id}")
            conversations[conversation_id] = {
                "messages": [],
                "created_at": datetime.now().isoformat()
            }
        
        # Add user message to conversation
        conversations[conversation_id]["messages"].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        print(f"[DEBUG] Added user message to conversation {conversation_id}")
        
        # Prepare OpenAI request
        openai_messages = [
            {"role": "system", "content": f"אתה עוזר וירטואלי בשם {settings.get('botName', 'עוזר')}. ענה בעברית בצורה ידידותית ומועילה."}
        ]
        
        # Add conversation history
        for msg in conversations[conversation_id]["messages"]:
            openai_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        print(f"[DEBUG] BEFORE OpenAI API call - Messages count: {len(openai_messages)}")
        print(f"[DEBUG] OpenAI request payload: {openai_messages}")
        
        print(f"[DEBUG] client created api_key={settings['openaiApiKey']}")
        # Call OpenAI API
        client = OpenAI(api_key=str(settings['openaiApiKey']))
        print(f"[DEBUG] client created")

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=openai_messages,
            max_tokens=500,
            temperature=0.7
        )
        
        print(f"[DEBUG] AFTER OpenAI API call - Response received successfully")
        ai_response = response.choices[0].message.content
        print(f"[DEBUG] OpenAI response: '{ai_response}'")
        
        # Add AI response to conversation
        conversations[conversation_id]["messages"].append({
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now().isoformat()
        })
        print(f"[DEBUG] Added AI response to conversation {conversation_id}")
        
        return jsonify({
            "response": ai_response,
            "conversationId": conversation_id
        })
        
    # except openai.AuthenticationError:
    #     print("[DEBUG] OpenAI Authentication Error - Invalid API key")
    #     return jsonify({"error": "מפתח OpenAI לא תקין"}), 401
    # except openai.RateLimitError:
    #     print("[DEBUG] OpenAI Rate Limit Error")
    #     return jsonify({"error": "חרגת ממגבלת הקריאות ל-OpenAI"}), 429
    except Exception as e:
        print(f"[DEBUG] Error in OpenAI request: {str(e)}")
        return jsonify({"error": f"שגיאה בשליחה ל-OpenAI: {str(e)}"}), 500

@app.route('/api/lead/submit', methods=['POST'])
def submit_lead():
    """Submit lead data to webhook"""
    print(f"[DEBUG] POST /api/lead/submit - Request received from {request.remote_addr}")
    try:
        lead_data = request.json
        conversation_id = lead_data.get('conversationId')
        print(f"[DEBUG] Lead submission - Conversation ID: {conversation_id}")
        print(f"[DEBUG] Lead data: {lead_data}")
        
        if not lead_data:
            print("[DEBUG] No lead data provided in request")
            return jsonify({"error": "Lead data is required"}), 400
        
        # Add conversation history to lead data
        if conversation_id and conversation_id in conversations:
            lead_data['conversation'] = conversations[conversation_id]
            print(f"[DEBUG] Added conversation history to lead data")
        
        # Add timestamp
        lead_data['submitted_at'] = datetime.now().isoformat()
        
        # Send to webhook if configured
        webhook_url = settings.get('webhookUrl')
        print(f"[DEBUG] Webhook URL: {webhook_url}")
        if webhook_url and webhook_url != "https://api.example.com/webhook":
            print(f"[DEBUG] BEFORE webhook call to: {webhook_url}")
            print(f"[DEBUG] Webhook payload: {lead_data}")
            try:
                webhook_response = requests.post(
                    webhook_url,
                    json=lead_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                
                print(f"[DEBUG] AFTER webhook call - Status code: {webhook_response.status_code}")
                print(f"[DEBUG] Webhook response: {webhook_response.text}")
                
                if webhook_response.status_code == 200:
                    # Clean up conversation after successful submission
                    if conversation_id in conversations:
                        del conversations[conversation_id]
                        print(f"[DEBUG] Cleaned up conversation {conversation_id}")
                    
                    return jsonify({
                        "message": "Lead submitted successfully",
                        "webhook_status": "success"
                    })
                else:
                    print(f"[DEBUG] Webhook failed with status: {webhook_response.status_code}")
                    return jsonify({
                        "message": "Lead received but webhook failed",
                        "webhook_status": "failed",
                        "webhook_error": f"Status code: {webhook_response.status_code}"
                    }), 200
                    
            except requests.RequestException as e:
                print(f"[DEBUG] Webhook request exception: {str(e)}")
                return jsonify({
                    "message": "Lead received but webhook failed",
                    "webhook_status": "failed",
                    "webhook_error": str(e)
                }), 200
        else:
            print("[DEBUG] No webhook configured or using default URL")
            return jsonify({
                "message": "Lead received (no webhook configured)",
                "webhook_status": "no_webhook"
            })
            
    except Exception as e:
        print(f"[DEBUG] Error in lead submission: {str(e)}")
        return jsonify({"error": f"שגיאה בשליחת הליד: {str(e)}"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    print(f"[DEBUG] GET /api/health - Request received from {request.remote_addr}")
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "settings_configured": bool(settings.get('openaiApiKey'))
    })

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get all active conversations (for debugging)"""
    print(f"[DEBUG] GET /api/conversations - Request received from {request.remote_addr}")
    print(f"[DEBUG] Active conversations: {list(conversations.keys())}")
    return jsonify({
        "active_conversations": len(conversations),
        "conversations": list(conversations.keys())
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"Starting server on port {port}")
    print(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)