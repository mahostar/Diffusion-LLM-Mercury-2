import { useState, useEffect } from 'react';
import { getConversations, createConversation, deleteConversation, onUpdate } from '../services/unified-database';
import './Sidebar.css';

function Sidebar({ isOpen, currentConversationId, onSelectConversation, onNewConversation }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadConversations();
    
    // Listen for real-time updates
    const unsubscribe = onUpdate((message) => {
      console.log('Sidebar received update:', message);
      if (['conversation_created', 'conversation_updated', 'conversation_deleted'].includes(message.type)) {
        loadConversations();
      }
    });
    
    return unsubscribe;
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convos = await getConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const conversation = await createConversation();
      await loadConversations();
      onNewConversation(conversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleDeleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversationId);
      await loadConversations();
      if (currentConversationId === conversationId) {
        onNewConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button className="new-conversation-button" onClick={handleNewConversation}>
          +
        </button>
      </div>
      <div className="conversations-list">
        {conversations.length === 0 ? (
          <div className="empty-conversations">
            <p>No conversations yet</p>
            <p className="hint">Create a new conversation to get started</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                currentConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <span className="conversation-title">{conversation.title}</span>
              <button
                className="delete-button"
                onClick={(e) => handleDeleteConversation(e, conversation.id)}
                title="Delete conversation"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
