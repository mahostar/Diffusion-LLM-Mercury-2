/**
 * Memory-based Backend Server for Electron Desktop App
 * Uses in-memory storage to avoid SQLite compilation issues
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';

class MemoryBackendServer {
  constructor() {
    this.app = express();
    this.conversations = [];
    this.messages = [];
    this.nextConversationId = 1;
    this.nextMessageId = 1;
    this.wss = null;
    this.server = null;
    this.wsServer = null;
  }

  async initialize() {
    // Middleware
    this.app.use(express.json());

    // Load existing data if available
    await this.loadData();

    // Setup routes
    this.setupRoutes();

    // Start servers
    await this.startServers();
  }

  async loadData() {
    const userDataPath = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), 'userData');
    const dataFile = path.join(userDataPath, 'app-data.json');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    try {
      if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        this.conversations = data.conversations || [];
        this.messages = data.messages || [];
        this.nextConversationId = Math.max(...this.conversations.map(c => c.id), 0) + 1;
        this.nextMessageId = Math.max(...this.messages.map(m => m.id), 0) + 1;
        console.log('Data loaded from:', dataFile);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async saveData() {
    const userDataPath = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), 'userData');
    const dataFile = path.join(userDataPath, 'app-data.json');

    try {
      const data = {
        conversations: this.conversations,
        messages: this.messages,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Conversations
    this.app.get('/api/conversations', (req, res) => {
      try {
        res.json(this.conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/conversations', (req, res) => {
      try {
        const { title } = req.body;
        const newConversation = {
          id: this.nextConversationId++,
          title: title || 'New Conversation',
          created_at: new Date().toISOString()
        };
        
        this.conversations.push(newConversation);
        this.saveData();
        
        this.broadcastUpdate('conversation_created', newConversation);
        res.json(newConversation);
      } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.put('/api/conversations/:id', (req, res) => {
      try {
        const { title } = req.body;
        const conversation = this.conversations.find(c => c.id == req.params.id);
        
        if (conversation) {
          conversation.title = title;
          this.saveData();
          this.broadcastUpdate('conversation_updated', conversation);
          res.json(conversation);
        } else {
          res.status(404).json({ error: 'Conversation not found' });
        }
      } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.delete('/api/conversations/:id', (req, res) => {
      try {
        const conversationId = parseInt(req.params.id);
        this.messages = this.messages.filter(m => m.conversation_id !== conversationId);
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.saveData();
        
        this.broadcastUpdate('conversation_deleted', { id: conversationId });
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Messages
    this.app.get('/api/conversations/:id/messages', (req, res) => {
      try {
        const conversationMessages = this.messages
          .filter(m => m.conversation_id == req.params.id)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        res.json(conversationMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/conversations/:id/messages', (req, res) => {
      try {
        const { role, content } = req.body;
        const newMessage = {
          id: this.nextMessageId++,
          conversation_id: parseInt(req.params.id),
          role,
          content,
          created_at: new Date().toISOString()
        };
        
        this.messages.push(newMessage);
        this.saveData();
        
        this.broadcastUpdate('message_created', newMessage);
        res.json(newMessage);
      } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  async startServers() {
    // Find available ports
    const apiPort = await this.findAvailablePort(3001);
    const wsPort = await this.findAvailablePort(8081);

    // Start HTTP server
    this.server = this.app.listen(apiPort, '127.0.0.1');
    console.log(`Backend API server running on http://127.0.0.1:${apiPort}`);

    // Start WebSocket server
    this.wsServer = new WebSocketServer({ port: wsPort });
    this.setupWebSocket();
    console.log(`WebSocket server running on ws://127.0.0.1:${wsPort}`);

    return { apiPort, wsPort };
  }

  setupWebSocket() {
    this.wss = this.wsServer;
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected to WebSocket');
      
      ws.on('message', (message) => {
        // Broadcast updates to all connected clients
        this.wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(message);
          }
        });
      });

      ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
      });
    });
  }

  broadcastUpdate(type, data) {
    if (this.wss) {
      const message = JSON.stringify({ type, data });
      this.wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    }
  }

  async findAvailablePort(startPort) {
    const net = await import('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      
      server.on('error', () => {
        this.findAvailablePort(startPort + 1).then(resolve);
      });
    });
  }

  shutdown() {
    if (this.server) {
      this.server.close();
    }
    if (this.wsServer) {
      this.wsServer.close();
    }
    this.saveData();
  }
}

export default MemoryBackendServer;
