import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, run } from '../db/database.js';
import { sendToClaude } from '../services/claude.js';
import { sendToOpenAI } from '../services/openai.js';
import { sendToGemini } from '../services/gemini.js';
import { sendToMistral } from '../services/mistral.js';
import { ApiKeyMissingError } from '../middleware/errorHandler.js';

const router = Router();

// Simple token estimator (mirrors frontend logic)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// POST /api/chat — send message and get AI response
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, message, provider, model, history } = req.body;

    if (!sessionId || !message || !provider || !model) {
      return res.status(400).json({
        error: true,
        message: 'sessionId, message, provider, and model are required'
      });
    }

    // Look up API key
    let apiKey;
    let baseURL = null;
    let isCustom = false;

    if (provider.startsWith('custom_')) {
      const { customApiKey, customBaseUrl } = req.body;
      if (!customApiKey) {
        throw new ApiKeyMissingError('custom');
      }
      apiKey = customApiKey;
      baseURL = customBaseUrl;
      isCustom = true;
    } else {
      const keyRow = getOne('SELECT api_key FROM provider_keys WHERE provider = ?', [provider]);
      if (!keyRow) {
        throw new ApiKeyMissingError(provider);
      }
      apiKey = keyRow.api_key;
    }

    // Send to the appropriate provider
    let responseText;
    if (isCustom) {
      responseText = await sendToOpenAI(apiKey, model, history || [], message, baseURL);
    } else {
      switch (provider) {
        case 'claude':
          responseText = await sendToClaude(apiKey, model, history || [], message);
          break;
        case 'openai':
          responseText = await sendToOpenAI(apiKey, model, history || [], message);
          break;
        case 'google':
          responseText = await sendToGemini(apiKey, model, history || [], message);
          break;
        case 'mistral':
          responseText = await sendToMistral(apiKey, model, history || [], message);
          break;
        default:
          return res.status(400).json({
            error: true,
            message: `Unknown provider: ${provider}`
          });
      }
    }

    // Calculate token counts
    const userTokens = estimateTokens(message);
    const assistantTokens = estimateTokens(responseText);
    const now = new Date().toISOString();

    // Auto-title: check if this is the first message (BEFORE inserting)
    const existingCount = getOne(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [sessionId]
    );
    const isFirstMessage = !existingCount || existingCount.count === 0;

    // Store user message
    const userMsgId = uuidv4();
    run(
      `INSERT INTO messages (id, session_id, role, content, provider, model, token_count, created_at)
       VALUES (?, ?, 'user', ?, ?, ?, ?, ?)`,
      [userMsgId, sessionId, message, provider, model, userTokens, now]
    );

    // Store assistant response
    const assistantMsgId = uuidv4();
    run(
      `INSERT INTO messages (id, session_id, role, content, provider, model, token_count, created_at)
       VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)`,
      [assistantMsgId, sessionId, responseText, provider, model, assistantTokens, now]
    );

    if (isFirstMessage) {
      const generatedTitle = message.length > 50
        ? message.slice(0, 47) + '...'
        : message;
      run(
        'UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?',
        [generatedTitle, now, sessionId]
      );
    }

    // Update session total tokens and timestamp
    const session = getOne('SELECT total_tokens FROM sessions WHERE id = ?', [sessionId]);
    const newTotal = (session?.total_tokens || 0) + userTokens + assistantTokens + 8; // 4 tokens overhead per message × 2

    run(
      'UPDATE sessions SET total_tokens = ?, updated_at = ? WHERE id = ?',
      [newTotal, now, sessionId]
    );

    res.json({
      userMessage: {
        id: userMsgId,
        role: 'user',
        content: message,
        provider,
        model,
        token_count: userTokens,
        created_at: now
      },
      assistantMessage: {
        id: assistantMsgId,
        role: 'assistant',
        content: responseText,
        provider,
        model,
        token_count: assistantTokens,
        created_at: now
      },
      totalSessionTokens: newTotal
    });
  } catch (err) {
    next(err);
  }
});

export default router;
