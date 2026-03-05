import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import HTMLPreview from './components/HTMLPreview';
import Settings from './components/Settings';
import SettingsButton from './components/SettingsButton';
import { initDatabase, createConversation, cleanupDatabase } from './services/unified-database';
import './App.css';

const DEFAULT_SYSTEM_PROMPT = `You are an expert programmer and web developer. Your responses should always be in the form of a complete, valid HTML file. You are highly skilled in HTML, CSS, and JavaScript, and you create beautiful, functional web pages. Always provide your responses as a complete HTML document that can be rendered directly in a browser.`;

function App() {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    initializeApp();
    // Load system prompt from localStorage
    const saved = localStorage.getItem('system_prompt');
    if (saved) {
      setSystemPrompt(saved);
    }
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // Use default if no saved key
      setApiKey('sk_bed2f200ed05660614e035da6b49a2bc');
    }

    // Cleanup on unmount
    return () => {
      cleanupDatabase();
    };
  }, []);

  const initializeApp = async () => {
    try {
      await initDatabase();
      setDbInitialized(true);
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  };

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
    setHtmlContent(null); // Clear preview when switching conversations
  };

  const handleNewConversation = async (conversationId) => {
    if (conversationId === null) {
      setCurrentConversationId(null);
      setHtmlContent(null);
      return;
    }
    
    if (!conversationId) {
      try {
        const id = await createConversation();
        setCurrentConversationId(id);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    } else {
      setCurrentConversationId(conversationId);
    }
    setHtmlContent(null);
  };

  const handleExtractHTML = (html) => {
    setHtmlContent(html);
  };

  if (!dbInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <SettingsButton onClick={() => setSettingsOpen(true)} />
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSystemPromptChange={setSystemPrompt}
        onApiKeyChange={setApiKey}
      />
      <div className="app-container">
        <button 
          className={`sidebar-toggle ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        <Sidebar
          isOpen={sidebarOpen}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        <div className="main-content">
          <ChatPanel
            conversationId={currentConversationId}
            onExtractHTML={handleExtractHTML}
            systemPrompt={systemPrompt}
            apiKey={apiKey}
          />
          <HTMLPreview htmlContent={htmlContent} />
        </div>
      </div>
    </div>
  );
}

export default App;
