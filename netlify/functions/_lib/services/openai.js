import OpenAI from 'openai';
import { ProviderError } from '../middleware/errorHandler.js';

export async function sendToOpenAI(apiKey, model, history, newMessage, baseURL = null) {
  try {
    const config = { apiKey };
    if (baseURL) {
      config.baseURL = baseURL;
    }
    const client = new OpenAI(config);

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: newMessage }
    ];

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 4096
    });

    return response.choices[0].message.content;
  } catch (err) {
    throw new ProviderError('OpenAI/Custom', err.message);
  }
}
