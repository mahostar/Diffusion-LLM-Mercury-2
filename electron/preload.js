// Preload script for Electron
// This runs in a context that has access to both the DOM and Node.js APIs
// but is isolated from the main renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the Node.js APIs without exposing the entire Node.js API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Database operations
  loadDatabase: () => ipcRenderer.invoke('load-database'),
  saveDatabase: (data) => ipcRenderer.invoke('save-database', data),
  
  // Listen for database updates from other windows
  onDatabaseUpdated: (callback) => {
    ipcRenderer.on('database-updated', callback);
  },
  
  // Remove listener
  removeDatabaseListener: (callback) => {
    ipcRenderer.removeListener('database-updated', callback);
  }
});
