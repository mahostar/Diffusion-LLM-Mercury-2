# Backend Database Synchronization

This application now includes a backend server for cross-browser database synchronization.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Server
```bash
# Start both backend and frontend
npm run dev:full

# Or start them separately
npm run server  # Backend on http://localhost:3001
npm run dev     # Frontend on http://localhost:5173
```

### 3. For Electron Development
```bash
npm run electron:dev
```

## How It Works

### Backend Server (`server.js`)
- **REST API**: Provides endpoints for CRUD operations on conversations and messages
- **WebSocket**: Real-time synchronization between connected clients (port 8081)
- **SQLite Database**: Persistent storage using SQLite3

### Frontend Integration
- **Backend Database Service** (`src/services/backend-database.js`): Handles API calls and WebSocket connections
- **Real-time Updates**: Components automatically refresh when data changes
- **Cross-browser Sync**: Changes in one browser appear in all others

### API Endpoints

#### Conversations
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/:id` - Update conversation title
- `DELETE /api/conversations/:id` - Delete conversation

#### Messages
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `POST /api/conversations/:id/messages` - Add new message

### WebSocket Events
- `conversation_created` - New conversation created
- `conversation_updated` - Conversation updated
- `conversation_deleted` - Conversation deleted
- `message_created` - New message added

## Testing Cross-Browser Synchronization

1. Start the backend server: `npm run dev:full`
2. Open the app in multiple browsers/tabs:
   - Chrome: http://localhost:5173
   - Firefox: http://localhost:5173
   - Edge: http://localhost:5173
3. Create a conversation in one browser
4. The conversation should appear in all other browsers
5. Add messages and verify they sync across all instances

## Database Storage

The backend uses SQLite for persistent storage:
- **Location**: `server-database.sqlite` in project root
- **Backup**: Copy this file to backup your conversations
- **Portability**: Database can be moved between systems

## Troubleshooting

### Backend Won't Start
- Check if port 3001 is available
- Verify all dependencies are installed
- Check Node.js version (requires ES modules support)

### WebSocket Connection Issues
- Check if port 8080 is available
- Verify firewall settings
- Check browser console for errors

### Data Not Syncing
- Ensure backend server is running
- Check browser console for WebSocket connection status
- Verify network connectivity to localhost

## Development Notes

- The backend uses Express.js with SQLite3
- WebSocket server runs on port 8080
- CORS is enabled for development
- Database is created automatically on first run
