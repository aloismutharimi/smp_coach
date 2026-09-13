# 🧠 SMP Coach

A full-stack web application that predicts wellness goal achievement based on sleep, water intake, and daily steps, powered by AI coaching.

## 🌟 Features

- **Real-time Prediction**: Instant wellness score calculation (0-100)
- **AI Coaching**: Personalized advice using OpenRouter API (Gemini 2.0)
- **Session History**: Track all your submissions with timestamps
- **Hit Rate Analytics**: See your success rate at a glance
- **Fallback System**: Works even without API access
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Tech Stack

### Backend
- **Flask**: Python web framework
- **Requests**: API calls to OpenRouter
- **python-dotenv**: Environment variable management
- **Flask-CORS**: Cross-origin resource sharing

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Custom styling with dark theme
- **Vanilla JavaScript**: No framework dependencies

### APIs
- **OpenRouter**: AI coaching with Google's Gemini 2.0 Flash Lite

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- pip
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/smp-coach.git
cd smp-coach