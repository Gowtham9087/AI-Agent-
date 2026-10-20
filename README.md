# 🔥 FRIDAY — Advanced AI Assistant & Support Agent

An intelligent, full-stack, multi-turn AI assistant designed with a modern **ChatGPT-inspired interface**. Powered locally by **Ollama (`llama3.2`)**, featuring multimodal vision reasoning, page-by-page PDF document intelligence, real-time web search, voice speech synthesis & recognition, and persistent conversation history.

---

## 🚀 Key Features

### 💬 1. ChatGPT-Inspired User Experience
- **Sleek Dark Theme:** Premium, modern interface with glassmorphic accents, tailored typography, and responsive sidebar navigation.
- **Session Management:** Create, switch, rename, and delete multi-turn chat sessions with automated smart titling.
- **Interactive Message Actions:**
  - **Inline Prompt Editing:** Edit any previous user message; subsequent messages are cleared and the conversation regenerates seamlessly from that point.
  - **One-Click Copy:** Fast copy-to-clipboard for both user prompts and AI responses with visual confirmation.
  - **Share Modal:** Message preview card with copyable link/text and native Web Share API (`navigator.share`) support.
- **Profile & Auth Modal:** Clickable profile area with a ChatGPT-style sign-in / sign-up modal and local persistence.

### 📄 2. PDF & Document Intelligence
- **Multi-File Uploads:** Attach documents, images, and videos via the `+` attach button, drag-and-drop, or clipboard paste (`Ctrl+V`).
- **Automated PDF Parsing:** Powered by `pypdf`, extracting full page-by-page text from multi-page PDFs with structured headers (`--- Page N ---`).
- **Disk-Level Fallback:** Automatically resolves and reads attached files directly from local storage if text is requested.
- **Document Question & Answering:** Ask summaries, explanations, comparisons, and detailed technical queries on uploaded files.

### 👁️ 3. Multimodal Vision Reasoning
- **Local Vision Model Support:** Automatically detects vision models in Ollama (`moondream`, `llama3.2-vision`, `llava`) for fast, local image analysis.
- **Media Lightbox:** Click any uploaded image thumbnail to inspect it in a full-screen dark lightbox preview.

### 🎙️ 4. Voice & Speech Assistant
- **Speech-to-Text (STT):** Speak directly to Friday using the Web Speech recognition API.
- **Text-to-Speech (TTS Read Aloud):** High-clarity speech synthesis with smart code-filtering so technical code snippets and symbols aren't repetitively vocalized.

### 🔍 5. Tools & ReAct Agent Loop
- **Real-Time Web Search:** Live online lookups via DuckDuckGo when queries ask for real-time information or news.
- **FLAMES Relationship Game:** High-precision relationship calculator with complete step-by-step 5-round elimination tracking.

---

## 🏗️ Project Architecture

```
support-agent/
├── app.py                  # Flask server, file uploads, session & chat endpoints
├── agent.py                # ReAct loop, vision model detection, document routing
├── database.py             # SQLite database layer (sessions, messages, attachments)
├── tools.py                # Tool schemas & integrations (DuckDuckGo search)
├── requirements.txt        # Python dependencies
├── static/
│   ├── index.html          # Main application layout
│   ├── logo.png            # Friday AI assistant logo
│   ├── css/                # Modular stylesheet architecture
│   │   ├── base.css        # Variables, reset, root styles
│   │   ├── sidebar.css     # Collapsible sidebar, session list
│   │   ├── chat.css        # Message bubbles, action bar, attachments, lightbox
│   │   ├── prompt.css      # Input textarea, chips, attachment preview strip
│   │   └── modals.css      # Auth modal, share dialog, profile popover
│   ├── js/                 # Modular client architecture
│   │   ├── main.js         # Entry point & app bootstrap
│   │   ├── chat.js         # Chat streaming, inline edits, attachments, lightbox
│   │   ├── sessions.js     # Session creation, switching, renaming, deletion
│   │   ├── voice.js        # Text-to-speech engine with code-block filters
│   │   ├── speech-input.js # Speech-to-text microphone recognition
│   │   └── auth.js         # Authentication modal & user profile state
│   └── uploads/            # Storage directory for uploaded files & media
└── shop.db                 # SQLite database file (auto-initialized)
```

---

## 🛠️ Getting Started

### Prerequisites
1. **Python 3.10+**
2. **[Ollama](https://ollama.com/)** installed and running on your system.
3. Download the recommended models:
   ```bash
   # Main chat & reasoning model
   ollama run llama3.2

   # Vision model (optional, for image question answering)
   ollama pull moondream
   ```

---

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Gowtham9087/AI-Agent-.git
   cd AI-Agent-
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Friday Assistant:**
   ```bash
   python app.py
   ```

5. **Open in your browser:**
   ```
   http://127.0.0.1:5000
   ```

---

## 🧪 Testing Features

- **Chat & Prompts:** Ask coding questions, general explanations, or casual conversation.
- **Upload PDF:** Click `+`, select any PDF (e.g. documentation, guides, reports), and ask `"Summarize this document"` or `"Explain this file in detail"`.
- **Upload Images:** Paste or attach images and ask `"Describe this image"` or ask questions about diagrams.
- **Edit & Branch:** Hover over any prompt, click **Edit**, modify the text, and hit **Send** to regenerate.
- **Voice:** Click the microphone icon to speak, and click the speaker icon on any message to listen.

---

## 📄 License

This project is licensed under the MIT License.
