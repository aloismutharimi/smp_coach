import os
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-please-change')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

# ===== ROUTE 1: Health Check =====
# Purpose: Check if server is running and AI is configured
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ai_configured': bool(OPENROUTER_API_KEY)  # True if API key exists
    })

# ===== ROUTE 2: Prediction =====
# Purpose: Calculate wellness score based on sleep, water, steps
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Get data from the request
        data = request.json
        sleep = float(data.get('sleep', 0))
        water = int(data.get('water', 0))
        steps = int(data.get('steps', 0))
        
        # Calculate scores (each contributes to total)
        sleep_score = min(sleep / 8.0, 1.0) * 35      # Sleep: 35% of total
        water_score = min(water / 10.0, 1.0) * 25    # Water: 25% of total
        steps_score = min(steps / 12000, 1.0) * 40   # Steps: 40% of total
        
        total_score = sleep_score + water_score + steps_score
        
        # Determine if goal is hit (threshold: 60/100)
        hit_goal = total_score >= 60
        distance = abs(total_score - 60)
        confidence = min(0.50 + distance * 0.012, 0.95)
        
        return jsonify({
            'hitGoal': hit_goal,
            'confidence': confidence,
            'score': round(total_score)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ===== ROUTE 3: AI Coaching =====
# Purpose: Get personalized coaching advice
@app.route('/api/coach', methods=['POST'])
def get_coaching():
    try:
        data = request.json
        sleep = float(data.get('sleep', 0))
        water = int(data.get('water', 0))
        steps = int(data.get('steps', 0))
        hit_goal = data.get('hitGoal', False)
        score = int(data.get('score', 0))
        
        # Try to use AI if API key exists
        if OPENROUTER_API_KEY:
            try:
                coaching = get_ai_coaching(sleep, water, steps, hit_goal, score)
                return jsonify({
                    'coaching': coaching,
                    'source': 'ai'
                })
            except Exception as e:
                print(f"AI coaching failed: {e}")
        
        # Fallback to template coaching
        coaching = get_fallback_coaching(sleep, water, hit_goal)
        return jsonify({
            'coaching': coaching,
            'source': 'fallback'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ===== HELPER: AI Coaching =====
# Purpose: Call OpenRouter API for personalized advice
def get_ai_coaching(sleep, water, steps, hit_goal, score):
    status = 'HIT the goal' if hit_goal else 'MISSED the goal'
    
    prompt = f"""You are a health and wellness coach. Based on these metrics:
- Sleep: {sleep} hours (target: 8 hours)
- Water: {water} glasses (target: 10 glasses) 
- Steps: {steps} (target: 12,000)
- Overall score: {score}/100
- Goal status: {status}

Provide 2-3 sentences of personalized, actionable coaching advice. Be specific and encouraging. Keep it concise."""
    
    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'SMP Coach'
    }
    
    payload = {
        'model': 'google/gemini-2.0-flash-lite-preview-02-05:free',
        'messages': [
            {'role': 'system', 'content': 'You are a concise, encouraging health coach.'},
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': 150,
        'temperature': 0.7
    }
    
    # Make the API call
    response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
    response.raise_for_status()
    
    data = response.json()
    return data['choices'][0]['message']['content'].strip()

# ===== HELPER: Fallback Coaching =====
# Purpose: Provide template advice when AI is unavailable
def get_fallback_coaching(sleep, water, hit_goal):
    COACHING = {
        "111": "Strong inputs, strong output. Baseline is locked in. Keep this pattern consistent.",
        "110": "Hit the goal despite low water. Sleep is the primary driver. Close the hydration gap tomorrow.",
        "101": "Water carried today despite low sleep. Fix sleep tonight. Low sleep has hidden costs.",
        "100": "Goal hit through willpower, not system. Willpower runs out. Fix the foundation: sleep first, water second.",
        "011": "Inputs were solid but the goal was missed. Audit your schedule. Do not cut sleep or water.",
        "010": "Sleep is solid but hydration is low, and the goal was missed. Add two glasses of water tomorrow.",
        "001": "Low sleep is the lead variable. Water is fine. Get to bed 45 minutes earlier tonight.",
        "000": "Both inputs are below threshold and the goal was missed. Reset tonight: 8 hours sleep minimum, 10 glasses water.",
    }
    # Create key: [hitGoal?][sleep>=7?][water>=8?]
    key = f"{1 if hit_goal else 0}{1 if sleep >= 7 else 0}{1 if water >= 8 else 0}"
    return COACHING.get(key, "Focus on improving sleep, hydration, and daily activity.")

# ===== ROUTE 4: Main Page =====
# Purpose: Serve the HTML page
@app.route('/')
def index():
    return render_template('index.html')

# ===== RUN THE APP =====
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)