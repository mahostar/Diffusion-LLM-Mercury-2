/**
 * Database Service
 * 
 * Uses different storage mechanisms based on environment:
 * - Browser: IndexedDB for browser storage (more persistent than localStorage)
 * - Electron: File-based SQLite for cross-window synchronization
 * 
 * For desktop apps, the database is stored in:
 * - Windows: %APPDATA%/Diffution-LLM-Chat/database.sqlite
 * - macOS: ~/Library/Application Support/Diffution-LLM-Chat/database.sqlite
 * - Linux: ~/.config/Diffution-LLM-Chat/database.sqlite
 */

import initSqlJs from 'sql.js';

let db = null;
let SQL = null;
const DB_NAME = 'diffution_chat_db';
const DB_VERSION = 1;
const STORE_NAME = 'database';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// For Electron: listen for database updates from other windows
let databaseUpdateListener = null;

function setupDatabaseUpdateListener() {
  if (isElectron && window.electronAPI.onDatabaseUpdated) {
    databaseUpdateListener = () => {
      console.log('Database updated by another window, refreshing...');
      // Reload database from file
      initDatabase().catch(console.error);
    };
    
    window.electronAPI.onDatabaseUpdated(databaseUpdateListener);
  } else if (!isElectron) {
    // Browser: Use storage events for cross-tab synchronization
    databaseUpdateListener = (event) => {
      if (event.key === 'diffution_db_update') {
        console.log('Database updated by another tab, refreshing...');
        // Reload database from IndexedDB
        initDatabase().catch(console.error);
      }
    };
    
    window.addEventListener('storage', databaseUpdateListener);
  }
}

function cleanupDatabaseUpdateListener() {
  if (isElectron && window.electronAPI.removeDatabaseListener && databaseUpdateListener) {
    window.electronAPI.removeDatabaseListener(databaseUpdateListener);
    databaseUpdateListener = null;
  } else if (!isElectron && databaseUpdateListener) {
    window.removeEventListener('storage', databaseUpdateListener);
    databaseUpdateListener = null;
  }
}

// Notify other tabs/windows about database updates (browser only)
function notifyDatabaseUpdate() {
  if (!isElectron) {
    // Use localStorage to trigger storage events in other tabs
    localStorage.setItem('diffution_db_update', Date.now().toString());
    // Immediately remove to avoid accumulation
    localStorage.removeItem('diffution_db_update');
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Electron file-based database functions
async function loadDatabaseFromFile() {
  try {
    if (!isElectron) return null;
    
    // Request database file from Electron main process
    const result = await window.electronAPI.loadDatabase();
    return result ? new Uint8Array(result) : null;
  } catch (error) {
    console.error('Electron database load error:', error);
    return null;
  }
}

async function saveDatabaseToFile(data) {
  try {
    if (!isElectron) return;
    
    // Save database file via Electron main process
    await window.electronAPI.saveDatabase(Array.from(data));
  } catch (error) {
    console.error('Electron database save error:', error);
  }
}

async function loadDatabaseFromIndexedDB() {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('data');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(new Uint8Array(result));
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('IndexedDB load error:', error);
    return null;
  }
}

async function saveDatabaseToIndexedDB(data) {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(Array.from(data), 'data');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('IndexedDB save error:', error);
  }
}

// Migrate from localStorage to IndexedDB if needed
async function migrateFromLocalStorage() {
  try {
    const savedDb = localStorage.getItem('chat_database');
    if (savedDb) {
      const data = new Uint8Array(JSON.parse(savedDb));
      await saveDatabaseToIndexedDB(data);
      localStorage.removeItem('chat_database'); // Remove old data
      console.log('Migrated database from localStorage to IndexedDB');
      return data;
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
  return null;
}

export async function initDatabase() {
  if (db) return db;
  
  try {
    SQL = await initSqlJs({
      locateFile: (file) => {
        // Use local WASM file from public folder
        // Map any .wasm file request to our local copy
        if (file.endsWith('.wasm')) {
          return `/sql-wasm-browser.wasm`;
        }
        return file;
      }
    });
    
    let savedDb = null;
    
    // Try to load from appropriate storage
    if (isElectron) {
      savedDb = await loadDatabaseFromFile();
      // Setup cross-window synchronization
      setupDatabaseUpdateListener();
    } else {
      // Browser: Try IndexedDB first, then migrate from localStorage
      savedDb = await loadDatabaseFromIndexedDB();
      
      if (!savedDb) {
        savedDb = await migrateFromLocalStorage();
      }
    }
    
    if (savedDb) {
      db = new SQL.Database(savedDb);
    } else {
      db = new SQL.Database();
      // Create conversations table
      db.run(`
        CREATE TABLE conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create messages table
      db.run(`
        CREATE TABLE messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
      `);
      
      // Save the new database
      await saveDatabase();
    }
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export async function saveDatabase() {
  if (!db) return;
  
  try {
    const data = db.export();
    
    if (isElectron) {
      await saveDatabaseToFile(data);
    } else {
      await saveDatabaseToIndexedDB(data);
      // Notify other tabs about the update
      notifyDatabaseUpdate();
    }
  } catch (error) {
    console.error('Database save error:', error);
  }
}

export async function createConversation(title = 'New Conversation') {
  if (!db) await initDatabase();
  
  db.run('INSERT INTO conversations (title) VALUES (?)', [title]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  await saveDatabase();
  
  return id;
}

export async function getConversations() {
  if (!db) await initDatabase();
  
  const result = db.exec('SELECT * FROM conversations ORDER BY created_at DESC');
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    title: row[1],
    created_at: row[2]
  }));
}

export async function getMessages(conversationId) {
  if (!db) await initDatabase();
  
  const result = db.exec(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    conversation_id: row[1],
    role: row[2],
    content: row[3],
    created_at: row[4]
  }));
}

export async function addMessage(conversationId, role, content) {
  if (!db) await initDatabase();
  
  db.run(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversationId, role, content]
  );
  await saveDatabase();
}

export async function deleteConversation(conversationId) {
  if (!db) await initDatabase();
  
  db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);
  await saveDatabase();
}

export async function updateConversationTitle(conversationId, title) {
  if (!db) await initDatabase();
  
  db.run('UPDATE conversations SET title = ? WHERE id = ?', [title, conversationId]);
  await saveDatabase();
}

// Cleanup function to be called when app unloads
export function cleanupDatabase() {
  cleanupDatabaseUpdateListener();
  db = null;
  SQL = null;
}
