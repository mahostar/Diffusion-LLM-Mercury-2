/**
 * Simple Embedded Backend Server for Electron Desktop App
 * Uses better-sqlite3 for easier compilation
 */

import express from 'express';
import Database from 'better-sqlite3';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';

class SimpleBackendServer {
  constructor() {
    this.app = express();
    this.db = null;
    this.wss = null;
    this.server = null;
    this.wsServer = null;
  }

  async initialize() {
    // Middleware
    this.app.use(express.json());

    // Initialize database
    await this.setupDatabase();

    // Setup routes
    this.setupRoutes();

    // Start servers
    await this.startServers();
  }

  async setupDatabase() {
    const userDataPath = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), 'userData');
    const dbPath = path.join(userDataPath, 'app-database.sqlite');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    try {
      this.db = new Database(dbPath);
      
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );
      `);

      console.log('Database initialized at:', dbPath);
    } catch (error) {
      console.error('Database initialization failed:', error);
      // Fallback to in-memory database
      this.db = new Database(':memory:');
      this.db.exec(`
        CREATE TABLE conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );
      `);
      console.log('Using in-memory database as fallback');
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
        const conversations = this.db.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all();
        res.json(conversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/conversations', (req, res) => {
      try {
        const { title } = req.body;
        const result = this.db.prepare('INSERT INTO conversations (title) VALUES (?)').run(title || 'New Conversation');
        
        const newConversation = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
        
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
        this.db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, req.params.id);
        
        const updatedConversation = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
        
        this.broadcastUpdate('conversation_updated', updatedConversation);
        res.json(updatedConversation);
      } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.delete('/api/conversations/:id', (req, res) => {
      try {
        this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
        this.db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
        
        this.broadcastUpdate('conversation_deleted', { id: req.params.id });
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Messages
    this.app.get('/api/conversations/:id/messages', (req, res) => {
      try {
        const messages = this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
        res.json(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/conversations/:id/messages', (req, res) => {
      try {
        const { role, content } = req.body;
        const result = this.db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(req.params.id, role, content);
        
        const newMessage = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
        
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
    if (this.db) {
      this.db.close();
    }
  }
}

export default SimpleBackendServer;
