import { getConnectorsByUser } from './queries';
import type { Message, Connector } from '../types';

// Keys are read from the connectors table — never hardcoded.

export interface AIResponse {
  content: string;
  model: string;
  connector: string;
}

export async function sendChatMessage(
  userId: string,
  history: Message[],
  newMessage: string,
  systemPrompt?: string,
): Promise<AIResponse> {
  const connectors = await getConnectorsByUser(userId);
  const active = connectors.find((c) => c.active && (c.name.toLowerCase().includes('openai') || c.name.toLowerCase().includes('godmode')));

  if (!active) {
    throw new Error('No active AI connector found. Configure OpenAI or Godmode.ai in the Connectors tab.');
  }

  const config = JSON.parse(active.config || '{}');
  const apiKey = config.api_key || '';

  if (!apiKey) {
    throw new Error(`API key not set for ${active.name}. Add your key in the Connectors tab.`);
  }

  if (active.name.toLowerCase().includes('godmode')) {
    return callGodmode(apiKey, history, newMessage, systemPrompt, active.name);
  }

  return callOpenAI(apiKey, history, newMessage, systemPrompt, active.name);
}

async function callOpenAI(
  apiKey: string,
  history: Message[],
  newMessage: string,
  systemPrompt?: string,
  connectorName?: string,
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  } else {
    messages.push({ role: 'system', content: 'You are CLARITY, an AI assistant. Be concise, helpful, and direct.' });
  }

  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role === 'system' ? 'assistant' : msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: newMessage });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || 'No response',
    model: data.model || 'gpt-4o-mini',
    connector: connectorName || 'OpenAI',
  };
}

async function callGodmode(
  apiKey: string,
  history: Message[],
  newMessage: string,
  systemPrompt?: string,
  connectorName?: string,
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role === 'system' ? 'assistant' : msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: newMessage });

  const response = await fetch('https://api.godmode.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Godmode API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || data.response || 'No response',
    model: data.model || 'godmode',
    connector: connectorName || 'Godmode.ai',
  };
}

export async function testConnector(connector: Connector): Promise<{ success: boolean; message: string }> {
  const config = JSON.parse(connector.config || '{}');
  const apiKey = config.api_key || '';

  if (!apiKey) {
    return { success: false, message: 'No API key configured. Add your key first.' };
  }

  try {
    if (connector.name.toLowerCase().includes('openai')) {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'OpenAI connection successful — API key is valid.' };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, message: err.error?.message || `HTTP ${response.status}` };
    }

    if (connector.name.toLowerCase().includes('godmode')) {
      const response = await fetch('https://api.godmode.ai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: 'Godmode.ai connection successful — API key is valid.' };
      }
      return { success: false, message: `HTTP ${response.status}` };
    }

    return { success: false, message: `Unknown connector type: ${connector.name}` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error — check your connection.' };
  }
}