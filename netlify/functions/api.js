import { v4 as uuidv4 } from 'uuid';
import { initDb, getAll, getOne, run } from './_lib/database.js';
import { formatError, ApiKeyMissingError } from './_lib/errorHandler.js';
import { sendToClaude } from './_lib/services/claude.js';
import { sendToOpenAI } from './_lib/services/openai.js';
import { sendToGemini } from './_lib/services/gemini.js';
import { sendToMistral } from './_lib/services/mistral.js';

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function corsHeaders() {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_SITE_URL,
  ].filter(Boolean);

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function handleSessions(method, body, params) {
  switch (method) {
    case 'GET': {
      const sessions = await getAll(
        'SELECT * FROM sessions ORDER BY updated_at DESC'
      );
      return { statusCode: 200, body: JSON.stringify(sessions) };
    }

    case 'POST': {
      const { title, provider, model } = body;
      if (!title || !provider || !model) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'title, provider, and model are required',
          }),
        };
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      await run(
        `INSERT INTO sessions (id, title, active_provider, active_model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, title, provider, model, now, now]
      );

      const session = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);
      return { statusCode: 201, body: JSON.stringify(session) };
    }

    default:
      return { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
  }
}

async function handleSessionById(method, body, params) {
  const { id } = params;

  switch (method) {
    case 'GET': {
      const session = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);
      if (!session) {
        return { statusCode: 404, body: JSON.stringify({ error: true, message: 'Session not found' }) };
      }

      const messages = await getAll(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [id]
      );

      const switches = await getAll(
        'SELECT * FROM model_switches WHERE session_id = ? ORDER BY switched_at ASC',
        [id]
      );

      return { statusCode: 200, body: JSON.stringify({ ...session, messages, switches }) };
    }

    case 'PUT': {
      const session = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);
      if (!session) {
        return { statusCode: 404, body: JSON.stringify({ error: true, message: 'Session not found' }) };
      }

      const { title, active_provider, active_model, total_tokens, from_provider, from_model } = body;
      const updates = [];
      const args = [];

      if (title !== undefined) { updates.push('title = ?'); args.push(title); }
      if (active_provider !== undefined) { updates.push('active_provider = ?'); args.push(active_provider); }
      if (active_model !== undefined) { updates.push('active_model = ?'); args.push(active_model); }
      if (total_tokens !== undefined) { updates.push('total_tokens = ?'); args.push(total_tokens); }

      updates.push('updated_at = ?');
      args.push(new Date().toISOString());
      args.push(id);

      await run(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`, args);

      if (active_provider && active_model && (from_provider || from_model)) {
        const switchId = uuidv4();
        await run(
          `INSERT INTO model_switches (id, session_id, from_provider, from_model, to_provider, to_model, tokens_at_switch)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [switchId, id, from_provider || session.active_provider, from_model || session.active_model, active_provider, active_model, total_tokens || session.total_tokens]
        );
      }

      const updated = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);
      return { statusCode: 200, body: JSON.stringify(updated) };
    }

    case 'DELETE': {
      const session = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);
      if (!session) {
        return { statusCode: 404, body: JSON.stringify({ error: true, message: 'Session not found' }) };
      }

      await run('DELETE FROM sessions WHERE id = ?', [id]);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Session deleted' }) };
    }

    default:
      return { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
  }
}

async function handleChat(body) {
  const { sessionId, message, provider, model, history } = body;

  if (!sessionId || !message || !provider || !model) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: true,
        message: 'sessionId, message, provider, and model are required',
      }),
    };
  }

  let apiKey;
  let baseURL = null;
  let isCustom = false;

  if (provider.startsWith('custom_')) {
    const { customApiKey, customBaseUrl } = body;
    if (!customApiKey) {
      throw new ApiKeyMissingError('custom');
    }
    apiKey = customApiKey;
    baseURL = customBaseUrl;
    isCustom = true;
  } else {
    const keyRow = await getOne('SELECT api_key FROM provider_keys WHERE provider = ?', [provider]);
    if (!keyRow) {
      throw new ApiKeyMissingError(provider);
    }
    apiKey = keyRow.api_key;
  }

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
        return {
          statusCode: 400,
          body: JSON.stringify({ error: true, message: `Unknown provider: ${provider}` }),
        };
    }
  }

  const userTokens = estimateTokens(message);
  const assistantTokens = estimateTokens(responseText);
  const now = new Date().toISOString();

  const existingCount = await getOne(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
    [sessionId]
  );
  const isFirstMessage = !existingCount || existingCount.count === 0;

  const userMsgId = uuidv4();
  await run(
    `INSERT INTO messages (id, session_id, role, content, provider, model, token_count, created_at)
     VALUES (?, ?, 'user', ?, ?, ?, ?, ?)`,
    [userMsgId, sessionId, message, provider, model, userTokens, now]
  );

  const assistantMsgId = uuidv4();
  await run(
    `INSERT INTO messages (id, session_id, role, content, provider, model, token_count, created_at)
     VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)`,
    [assistantMsgId, sessionId, responseText, provider, model, assistantTokens, now]
  );

  if (isFirstMessage) {
    const generatedTitle = message.length > 50 ? message.slice(0, 47) + '...' : message;
    await run('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?', [generatedTitle, now, sessionId]);
  }

  const session = await getOne('SELECT total_tokens FROM sessions WHERE id = ?', [sessionId]);
  const newTotal = (session?.total_tokens || 0) + userTokens + assistantTokens + 8;

  await run('UPDATE sessions SET total_tokens = ?, updated_at = ? WHERE id = ?', [newTotal, now, sessionId]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      userMessage: {
        id: userMsgId,
        role: 'user',
        content: message,
        provider,
        model,
        token_count: userTokens,
        created_at: now,
      },
      assistantMessage: {
        id: assistantMsgId,
        role: 'assistant',
        content: responseText,
        provider,
        model,
        token_count: assistantTokens,
        created_at: now,
      },
      totalSessionTokens: newTotal,
    }),
  };
}

async function handleProviders(method, body, params) {
  switch (method) {
    case 'GET': {
      const keys = await getAll('SELECT provider, added_at FROM provider_keys');
      const keyMap = {};
      keys.forEach(k => { keyMap[k.provider] = { connected: true, added_at: k.added_at }; });

      const providers = ['claude', 'openai', 'google', 'mistral'].map(pid => ({
        id: pid,
        connected: !!keyMap[pid],
        added_at: keyMap[pid]?.added_at || null,
      }));

      return { statusCode: 200, body: JSON.stringify(providers) };
    }

    case 'POST': {
      const { provider, apiKey } = body;
      if (!provider || !apiKey) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: true, message: 'provider and apiKey are required' }),
        };
      }

      const existing = await getOne('SELECT provider FROM provider_keys WHERE provider = ?', [provider]);

      if (existing) {
        await run('UPDATE provider_keys SET api_key = ?, added_at = ? WHERE provider = ?', [apiKey, new Date().toISOString(), provider]);
      } else {
        await run('INSERT INTO provider_keys (provider, api_key, added_at) VALUES (?, ?, ?)', [provider, apiKey, new Date().toISOString()]);
      }

      return { statusCode: 200, body: JSON.stringify({ success: true, provider, connected: true }) };
    }

    default:
      return { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
  }
}

async function handleProviderKeyDelete(method, body, params) {
  const { id } = params;
  await run('DELETE FROM provider_keys WHERE provider = ?', [id]);
  return { statusCode: 200, body: JSON.stringify({ success: true, provider: id, connected: false }) };
}

export async function handler(event, context) {
  await initDb();

  const { httpMethod, path, body } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    let result;

    if (path === '/sessions' || path === '/sessions/') {
      result = await handleSessions(httpMethod, parsedBody, {});
    } else if (path.startsWith('/sessions/')) {
      const id = path.replace('/sessions/', '');
      result = await handleSessionById(httpMethod, parsedBody, { id });
    } else if (path === '/chat' || path === '/chat/') {
      if (httpMethod !== 'POST') {
        result = { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
      } else {
        result = await handleChat(parsedBody);
      }
    } else if (path === '/providers' || path === '/providers/') {
      result = await handleProviders(httpMethod, parsedBody, {});
    } else if (path.startsWith('/providers/') && path.endsWith('/key')) {
      const id = path.replace('/providers/', '').replace('/key', '');
      if (httpMethod === 'DELETE') {
        result = await handleProviderKeyDelete(httpMethod, parsedBody, { id });
      } else {
        result = { statusCode: 405, body: JSON.stringify({ error: true, message: 'Method not allowed' }) };
      }
    } else if (path === '/health' || path === '/health/') {
      result = { statusCode: 200, body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }) };
    } else {
      result = { statusCode: 404, body: JSON.stringify({ error: true, message: 'Not found' }) };
    }

    return { ...result, headers: corsHeaders() };
  } catch (err) {
    const errorResponse = formatError(err);
    return { ...errorResponse, headers: corsHeaders() };
  }
}
