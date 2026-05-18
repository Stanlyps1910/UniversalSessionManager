import { GoogleGenAI } from '@google/genai';
import { ProviderError } from '../middleware/errorHandler.js';

export async function sendToGemini(apiKey, model, history, newMessage) {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const formattedHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const chat = ai.chats.create({
      model,
      history: formattedHistory
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (err) {
    throw new ProviderError('Gemini', err.message);
  }
}
