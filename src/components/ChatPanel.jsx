import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { sendMessage as apiSendMessage } from '../services/api';
import { addMessage, getMessages, onUpdate } from '../services/unified-database';
import { extractCompleteHTML } from '../utils/htmlUtils';
import './ChatPanel.css';

function ChatPanel({ conversationId, onExtractHTML, systemPrompt, apiKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
    }
    
    // Listen for real-time updates
    const unsubscribe = onUpdate((message) => {
      if (message.type === 'message_created' && message.data.conversation_id == conversationId) {
        loadMessages();
      }
    });
    
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const loadedMessages = await getMessages(conversationId);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !conversationId) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Save user message to database
    await addMessage(conversationId, 'user', userMessage.content);

    try {
      // Prepare ALL messages from conversation history for full chat awareness
      // This includes all previous messages + the new user message
      const apiMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send all messages with system prompt for full conversation awareness
      // The API will prepend the system message, so the AI has full context
      const response = await apiSendMessage(apiMessages, systemPrompt, apiKey);
      
      if (response.choices && response.choices[0]) {
        const assistantMessage = {
          role: 'assistant',
          content: response.choices[0].message.content
        };
        
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        
        // Save assistant message to database
        await addMessage(conversationId, 'assistant', assistantMessage.content);
        
        // Extract HTML from the response (get the most recent complete HTML block)
        if (onExtractHTML) {
          const completeHTML = extractCompleteHTML(assistantMessage.content);
          if (completeHTML) {
            onExtractHTML(completeHTML);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>Start a conversation</h3>
            <p>Ask the AI to create an HTML file for you</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              onExtractHTML={onExtractHTML}
            />
          ))
        )}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-header">
              <span className="message-role">Assistant</span>
            </div>
            <div className="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading || !conversationId}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !conversationId}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
