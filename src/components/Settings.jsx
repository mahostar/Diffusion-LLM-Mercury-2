import { useState, useEffect } from 'react';
import './Settings.css';

const DEFAULT_SYSTEM_PROMPT = `You are an expert programmer and web developer. Your responses should always be in the form of a complete, valid HTML file. You are highly skilled in HTML, CSS, and JavaScript, and you create beautiful, functional web pages. Always provide your responses as a complete HTML document that can be rendered directly in a browser.`;

const DEFAULT_API_KEY = 'sk_bed2f200ed05660614e035da6b49a2bc';

function Settings({ isOpen, onClose, onSystemPromptChange, onApiKeyChange }) {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Load saved system prompt from localStorage
    const saved = localStorage.getItem('system_prompt');
    if (saved) {
      setSystemPrompt(saved);
      if (onSystemPromptChange) {
        onSystemPromptChange(saved);
      }
    } else {
      if (onSystemPromptChange) {
        onSystemPromptChange(DEFAULT_SYSTEM_PROMPT);
      }
    }
    
    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      if (onApiKeyChange) {
        onApiKeyChange(savedApiKey);
      }
    } else {
      // Use default if no saved key
      setApiKey(DEFAULT_API_KEY);
      if (onApiKeyChange) {
        onApiKeyChange(DEFAULT_API_KEY);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('system_prompt', systemPrompt);
    localStorage.setItem('api_key', apiKey);
    if (onSystemPromptChange) {
      onSystemPromptChange(systemPrompt);
    }
    if (onApiKeyChange) {
      onApiKeyChange(apiKey);
    }
    onClose();
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setApiKey(DEFAULT_API_KEY);
    localStorage.setItem('system_prompt', DEFAULT_SYSTEM_PROMPT);
    localStorage.setItem('api_key', DEFAULT_API_KEY);
    if (onSystemPromptChange) {
      onSystemPromptChange(DEFAULT_SYSTEM_PROMPT);
    }
    if (onApiKeyChange) {
      onApiKeyChange(DEFAULT_API_KEY);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <label htmlFor="api-key" className="settings-label">
              API Key
            </label>
            <p className="settings-description">
              Your Inception Labs API key. Keep this secure and don't share it.
            </p>
            <input
              id="api-key"
              type="password"
              className="settings-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
            />
          </div>
          
          <div className="settings-section">
            <label htmlFor="system-prompt" className="settings-label">
              System Prompt
            </label>
            <p className="settings-description">
              This prompt defines how the AI behaves. It will be aware of the full conversation history.
            </p>
            <textarea
              id="system-prompt"
              className="settings-textarea"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt..."
              rows={8}
            />
          </div>
          
          <div className="settings-actions">
            <button className="settings-button secondary" onClick={handleReset}>
              Reset to Default
            </button>
            <button className="settings-button primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
