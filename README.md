# Diffution LLM Chat - Desktop App

A cross-platform LLM chat application with real-time synchronization and desktop installer capabilities.

## 🚀 Features

- **Cross-platform chat application** - Works in browsers and as a desktop app
- **Real-time synchronization** - Changes sync across multiple windows and browsers
- **Embedded backend server** - No external server required for desktop version
- **Desktop installer** - Windows installer with embedded Electron app
- **Persistent storage** - Data saved automatically
- **HTML generation** - AI can generate complete HTML files
- **Multi-window support** - Open multiple app instances with sync

## 📦 Installation

### Desktop Application (Recommended)

1. Download the latest installer from [Releases](https://github.com/mahostar/Diffusion-LLM-Mercury-2/releases)
2. Run `Diffusion LLM Chat Setup 1.0.0.exe`
3. Launch from Start Menu

### Web Version

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev:full` (starts both backend and frontend)
4. Open http://localhost:5173

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/mahostar/Diffusion-LLM-Mercury-2.git
cd Diffusion-LLM-Mercury-2

# Install dependencies
npm install

# Development mode (web + backend)
npm run dev:full

# Development mode (Electron)
npm run electron:dev
```

### Building

```bash
# Build for web
npm run build

# Build desktop application
npm run electron:build

# Package without installer
npm run electron:pack
```

## 🏗️ Architecture

### Web Version
- **Frontend**: React + Vite
- **Backend**: Express.js + SQLite
- **Real-time**: WebSocket server
- **Database**: SQLite with REST API

### Desktop Version
- **Frontend**: React + Vite (embedded)
- **Backend**: Express.js (embedded in Electron)
- **Real-time**: WebSocket server (embedded)
- **Storage**: JSON file in AppData
- **Runtime**: Electron with Node.js

## 📁 Project Structure

```
Diffusion-LLM-Mercury-2/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── services/          # API and database services
│   └── utils/             # Utility functions
├── electron/               # Electron main process
│   ├── main.js            # Electron main entry point
│   ├── backend-server*.js # Embedded backend servers
│   └── preload.js         # Preload script
├── public/                 # Static assets
├── server.js              # Standalone backend server
├── release/               # Built desktop application
└── dist/                  # Built web application
```

## 🔧 Configuration

### API Keys

The app uses OpenAI's API by default. Set your API key in the settings or use environment variable:

```bash
export OPENAI_API_KEY=your_api_key_here
```

### Database

- **Web version**: SQLite database (`server-database.sqlite`)
- **Desktop version**: JSON file (`%APPDATA%/Diffusion-LLM-Chat/app-data.json`)

## 🌐 API Endpoints

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/conversations/:id/messages` - Add new message

### WebSocket Events
- `conversation_created` - New conversation created
- `conversation_updated` - Conversation updated
- `conversation_deleted` - Conversation deleted
- `message_created` - New message added

## 🔄 Real-time Synchronization

### Web Version
- Multiple browser tabs sync via localStorage events
- Multiple browser windows sync via backend WebSocket

### Desktop Version
- Multiple app windows sync via embedded WebSocket server
- Data persists to local JSON file

## 🎯 Usage

1. **Create conversations** - Click the "+" button in the sidebar
2. **Chat with AI** - Type messages and get AI responses
3. **Generate HTML** - Ask the AI to create complete HTML files
4. **Preview HTML** - View generated HTML in the preview panel
5. **Multi-window sync** - Open multiple windows to see real-time sync

## 🔒 Security

- **Desktop version**: All data stays local, no external connections
- **Web version**: Backend server runs locally, data doesn't leave your computer
- **API keys**: Stored locally, never sent to external servers

## 📱 System Requirements

### Desktop Application
- Windows 10 or later (x64 or x86)
- 4GB RAM minimum
- 200MB free disk space

### Web Version
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Node.js for development server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for the API
- Electron for desktop app framework
- React for the frontend framework
- Express.js for the backend server

## 📞 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/mahostar/Diffusion-LLM-Mercury-2/issues) page
2. Create a new issue with detailed information
3. Include your OS, browser, and steps to reproduce

---

**Enjoy your cross-platform LLM chat experience!** 🎉
