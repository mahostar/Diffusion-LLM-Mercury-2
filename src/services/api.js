const DEFAULT_API_KEY = 'sk_bed2f200ed05660614e035da6b49a2bc';
const API_URL = 'https://api.inceptionlabs.ai/v1/chat/completions';

const DEFAULT_SYSTEM_PROMPT = `You are an expert programmer and web developer. Your responses should always be in the form of a complete, valid HTML file. You are highly skilled in HTML, CSS, and JavaScript, and you create beautiful, functional web pages. Always provide your responses as a complete HTML document that can be rendered directly in a browser.`;

// Get API key from localStorage or use default
function getApiKey() {
  const saved = localStorage.getItem('api_key');
  return saved || DEFAULT_API_KEY;
}

// Get system prompt from localStorage or use default
function getSystemPrompt() {
  const saved = localStorage.getItem('system_prompt');
  return saved || DEFAULT_SYSTEM_PROMPT;
}

export async function sendMessage(messages, systemPrompt = null, apiKey = null) {
  const prompt = systemPrompt || getSystemPrompt();
  const key = apiKey || getApiKey();
  
  if (!key) {
    throw new Error('API key is required. Please set it in Settings.');
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'mercury-2',
        messages: [
          { role: 'system', content: prompt },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
