/**
 * Unified Database Service
 * Automatically detects environment and uses appropriate backend:
 * - Electron: Uses embedded backend server
 * - Browser: Uses external backend server
 */

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Configuration based on environment
const config = {
  apiBaseUrl: isElectron ? 'http://127.0.0.1:3001/api' : 'http://localhost:3001/api',
  wsUrl: isElectron ? 'ws://127.0.0.1:8082' : 'ws://localhost:8082'
};

// WebSocket connection for real-time updates
let ws = null;
let updateCallbacks = [];

// Initialize WebSocket connection
function initWebSocket() {
  if (ws) return;

  try {
    ws = new WebSocket(config.wsUrl);

    ws.onopen = () => {
      console.log('Connected to backend WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received update:', message);
        
        // Notify all callbacks about the update
        updateCallbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in update callback:', error);
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed, attempting to reconnect...');
      ws = null;
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        initWebSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Don't immediately try to reconnect on error, let the onclose handle it
    };
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    // Retry after 3 seconds
    setTimeout(() => {
      initWebSocket();
    }, 3000);
  }
}

// Register callback for database updates
export function onUpdate(callback) {
  updateCallbacks.push(callback);
  return () => {
    updateCallbacks = updateCallbacks.filter(cb => cb !== callback);
  };
}

// Initialize the database service
export async function initDatabase() {
  console.log('Initializing database service for:', isElectron ? 'Electron' : 'Browser');
  console.log('API URL:', config.apiBaseUrl);
  console.log('WebSocket URL:', config.wsUrl);
  
  initWebSocket();
  return true;
}

// Cleanup WebSocket connection
export function cleanupDatabase() {
  if (ws) {
    ws.close();
    ws = null;
  }
  updateCallbacks = [];
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    // Handle empty response
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response text:', text);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Database operations
export async function getConversations() {
  return await apiRequest('/conversations');
}

export async function getMessages(conversationId) {
  return await apiRequest(`/conversations/${conversationId}/messages`);
}

export async function createConversation(title = 'New Conversation') {
  return await apiRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title })
  });
}

export async function addMessage(conversationId, role, content) {
  return await apiRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content })
  });
}

export async function deleteConversation(conversationId) {
  return await apiRequest(`/conversations/${conversationId}`, {
    method: 'DELETE'
  });
}

export async function updateConversationTitle(conversationId, title) {
  return await apiRequest(`/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify({ title })
  });
}

// Legacy saveDatabase function for compatibility
export async function saveDatabase() {
  // No-op for backend service - data is saved automatically
  console.log('Backend database: save not needed');
}
