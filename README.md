# Diffution LLM Chat - Desktop App

A React-based chat application for generating HTML files using the Inception Labs API. Available as both a web app and desktop application.

## Features

- 💬 **Chat Interface**: Interactive chat with AI that generates HTML files
- 🎨 **HTML Preview**: Live preview of generated HTML in a split-pane view
- 💾 **Conversation Management**: Save and manage multiple conversations
- ⚙️ **Customizable Settings**: 
  - Custom API key management
  - Customizable system prompt
- 🗄️ **Persistent Database**: SQLite database using IndexedDB (web) or file-based (desktop)
- 🖥️ **Desktop App**: Native desktop application for Windows, macOS, and Linux

## Installation

### Prerequisites

- Node.js 18+ and npm

### Install Dependencies

```bash
npm install
```

## Development

### Web Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Desktop Development

Run the app in Electron development mode:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Launch Electron and connect to the dev server

## Building for Production

### Build Web App

```bash
npm run build
```

The built files will be in the `dist` directory.

### Build Desktop App

Build the desktop application:

```bash
npm run electron:build
```

This will:
1. Build the React app
2. Package it with Electron
3. Create installers in the `release` directory

#### Build Options

- **Windows**: Creates an NSIS installer (.exe)
- **macOS**: Creates a DMG file
- **Linux**: Creates AppImage and .deb packages

### Pack Without Installer

To create a portable version without an installer:

```bash
npm run electron:pack
```

## Configuration

### API Key

1. Click the gear icon (⚙️) in the top-right corner
2. Enter your Inception Labs API key
3. Click "Save"

### System Prompt

You can customize the system prompt in Settings to change how the AI behaves.

## Database

The app uses SQLite for storing conversations and messages:

- **Web**: Uses IndexedDB (browser-specific)
- **Desktop**: Uses file-based SQLite (shared across all browsers on the same machine)

Database location for desktop app:
- **Windows**: `%APPDATA%/Diffution-LLM-Chat/database.sqlite`
- **macOS**: `~/Library/Application Support/Diffution-LLM-Chat/database.sqlite`
- **Linux**: `~/.config/Diffution-LLM-Chat/database.sqlite`

## Project Structure

```
├── electron/          # Electron main process files
│   ├── main.cjs       # Main Electron process
│   └── preload.cjs    # Preload script
├── src/
│   ├── components/    # React components
│   ├── services/      # API and database services
│   └── utils/         # Utility functions
├── public/            # Static assets
└── dist/              # Built files (after npm run build)
```

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Electron** - Desktop app framework
- **sql.js** - SQLite in the browser
- **IndexedDB** - Browser database storage

## License

Private project
