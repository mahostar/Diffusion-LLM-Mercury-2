/**
 * Backend Server for Database Synchronization
 * Provides REST API and WebSocket for real-time synchronization
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8082; // Changed from 8081 to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const DB_PATH = path.join(process.cwd(), 'server-database.sqlite');

async function setupDatabase() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
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

  return db;
}

// WebSocket setup for real-time updates
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', (message) => {
    // Broadcast updates to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Notify all WebSocket clients about database updates
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// API Routes
app.get('/api/conversations', async (req, res) => {
  try {
    const db = await setupDatabase();
    const conversations = await db.all('SELECT * FROM conversations ORDER BY created_at DESC');
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const db = await setupDatabase();
    const messages = await db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const db = await setupDatabase();
    const result = await db.run(
      'INSERT INTO conversations (title) VALUES (?)',
      [title || 'New Conversation']
    );
    
    const newConversation = await db.get('SELECT * FROM conversations WHERE id = ?', [result.lastID]);
    
    broadcastUpdate('conversation_created', newConversation);
    res.json(newConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { role, content } = req.body;
    const db = await setupDatabase();
    const result = await db.run(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [req.params.id, role, content]
    );
    
    const newMessage = await db.get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
    
    broadcastUpdate('message_created', newMessage);
    res.json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const db = await setupDatabase();
    await db.run('DELETE FROM messages WHERE conversation_id = ?', [req.params.id]);
    await db.run('DELETE FROM conversations WHERE id = ?', [req.params.id]);
    
    broadcastUpdate('conversation_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/conversations/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const db = await setupDatabase();
    await db.run('UPDATE conversations SET title = ? WHERE id = ?', [title, req.params.id]);
    
    const updatedConversation = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    
    broadcastUpdate('conversation_updated', updatedConversation);
    res.json(updatedConversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
});
