import { useState } from 'react';
import { extractCompleteHTML } from '../utils/htmlUtils';
import './ChatMessage.css';

function ChatMessage({ message, onExtractHTML }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // Extract HTML blocks from message content
  const extractHTMLBlocks = (content) => {
    const blocks = [];
    
    // Try to find complete HTML documents first
    const htmlDocRegex = /<!DOCTYPE\s+html[\s\S]*?<\/html>/gi;
    let matches = content.match(htmlDocRegex);
    if (matches) {
      blocks.push(...matches);
    }
    
    // Try to find HTML blocks with <html> tags
    const htmlTagRegex = /<html[\s\S]*?<\/html>/gi;
    matches = content.match(htmlTagRegex);
    if (matches) {
      // Only add if not already added
      matches.forEach(match => {
        if (!blocks.includes(match)) {
          blocks.push(match);
        }
      });
    }
    
    // If no complete HTML found, check if entire content is HTML-like
    if (blocks.length === 0) {
      const trimmed = content.trim();
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || 
          (trimmed.startsWith('<') && trimmed.includes('</'))) {
        blocks.push(trimmed);
      }
    }
    
    return blocks;
  };
  
  const htmlBlocks = extractHTMLBlocks(message.content);
  const isUser = message.role === 'user';
  
  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleExtractHTML = (html) => {
    if (onExtractHTML) {
      onExtractHTML(html);
    }
  };
  
  // If there are HTML blocks, show them separately
  if (htmlBlocks.length > 0 && !isUser) {
    return (
      <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
        <div className="message-header">
          <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
        </div>
        
        {htmlBlocks.map((html, index) => (
          <div key={index} className="code-block-container">
            <div className="code-block-header">
              <span className="code-block-title">HTML Block {index + 1}</span>
              <button
                className="copy-button"
                onClick={() => {
                  handleCopy(html, index);
                  // Extract the last HTML block to preview
                  if (index === htmlBlocks.length - 1) {
                    handleExtractHTML(html);
                  }
                }}
                title="Copy code"
              >
                {copiedIndex === index ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="code-block">
              <code>{html}</code>
            </pre>
          </div>
        ))}
        
        {/* Show any non-HTML text content */}
        {message.content.replace(/<html[\s\S]*?<\/html>/gi, '').trim() && (
          <div className="message-text">
            {message.content.replace(/<html[\s\S]*?<\/html>/gi, '').trim()}
          </div>
        )}
      </div>
    );
  }
  
  // Regular message without HTML blocks
  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
      </div>
      <div className="message-text">{message.content}</div>
      {!isUser && htmlBlocks.length === 0 && message.content.includes('<') && (
        <div className="code-block-container">
          <div className="code-block-header">
            <span className="code-block-title">Code</span>
            <button
              className="copy-button"
              onClick={() => {
                handleCopy(message.content, 'single');
                handleExtractHTML(message.content);
              }}
              title="Copy code"
            >
              {copiedIndex === 'single' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="code-block">
            <code>{message.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
