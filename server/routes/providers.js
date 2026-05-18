import { Router } from 'express';
import { getAll, getOne, run } from '../db/database.js';

const router = Router();

// GET /api/providers — list all providers with connection status
router.get('/', (req, res) => {
  try {
    const keys = getAll('SELECT provider, added_at FROM provider_keys');
    const keyMap = {};
    keys.forEach(k => { keyMap[k.provider] = { connected: true, added_at: k.added_at }; });

    const providers = ['claude', 'openai', 'google', 'mistral'].map(id => ({
      id,
      connected: !!keyMap[id],
      added_at: keyMap[id]?.added_at || null
    }));

    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/providers/key — save or update API key
router.post('/key', (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: true,
        message: 'provider and apiKey are required'
      });
    }

    const existing = getOne('SELECT provider FROM provider_keys WHERE provider = ?', [provider]);

    if (existing) {
      run(
        'UPDATE provider_keys SET api_key = ?, added_at = ? WHERE provider = ?',
        [apiKey, new Date().toISOString(), provider]
      );
    } else {
      run(
        'INSERT INTO provider_keys (provider, api_key, added_at) VALUES (?, ?, ?)',
        [provider, apiKey, new Date().toISOString()]
      );
    }

    res.json({ success: true, provider, connected: true });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// DELETE /api/providers/:id/key — remove API key
router.delete('/:id/key', (req, res) => {
  try {
    const { id } = req.params;
    run('DELETE FROM provider_keys WHERE provider = ?', [id]);
    res.json({ success: true, provider: id, connected: false });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
