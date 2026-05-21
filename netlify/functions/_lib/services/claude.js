import Anthropic from '@anthropic-ai/sdk';
import { ProviderError } from '../middleware/errorHandler.js';

export async function sendToClaude(apiKey, model, history, newMessage) {
  try {
    const client = new Anthropic({ apiKey });

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage }
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages
    });

    return response.content[0].text;
  } catch (err) {
    throw new ProviderError('Claude', err.message);
  }
}
