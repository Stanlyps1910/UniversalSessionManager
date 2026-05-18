import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../db/database.js';

const router = Router();

// GET /api/sessions — list all sessions
router.get('/', (req, res) => {
  try {
    const sessions = getAll(
      'SELECT * FROM sessions ORDER BY updated_at DESC'
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/sessions — create new session
router.post('/', (req, res) => {
  try {
    const { title, provider, model } = req.body;

    if (!title || !provider || !model) {
      return res.status(400).json({
        error: true,
        message: 'title, provider, and model are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    run(
      `INSERT INTO sessions (id, title, active_provider, active_model, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, provider, model, now, now]
    );

    const session = getOne('SELECT * FROM sessions WHERE id = ?', [id]);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// GET /api/sessions/:id — get session with messages and switches
router.get('/:id', (req, res) => {
  try {
    const session = getOne('SELECT * FROM sessions WHERE id = ?', [req.params.id]);

    if (!session) {
      return res.status(404).json({ error: true, message: 'Session not found' });
    }

    const messages = getAll(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    const switches = getAll(
      'SELECT * FROM model_switches WHERE session_id = ? ORDER BY switched_at ASC',
      [req.params.id]
    );

    res.json({ ...session, messages, switches });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// PUT /api/sessions/:id — update session
router.put('/:id', (req, res) => {
  try {
    const session = getOne('SELECT * FROM sessions WHERE id = ?', [req.params.id]);

    if (!session) {
      return res.status(404).json({ error: true, message: 'Session not found' });
    }

    const {
      title,
      active_provider,
      active_model,
      total_tokens,
      from_provider,
      from_model
    } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (active_provider !== undefined) {
      updates.push('active_provider = ?');
      params.push(active_provider);
    }
    if (active_model !== undefined) {
      updates.push('active_model = ?');
      params.push(active_model);
    }
    if (total_tokens !== undefined) {
      updates.push('total_tokens = ?');
      params.push(total_tokens);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    run(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log model switch if provider/model changed
    if (active_provider && active_model && (from_provider || from_model)) {
      const switchId = uuidv4();
      run(
        `INSERT INTO model_switches (id, session_id, from_provider, from_model, to_provider, to_model, tokens_at_switch)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [switchId, req.params.id, from_provider || session.active_provider, from_model || session.active_model, active_provider, active_model, total_tokens || session.total_tokens]
      );
    }

    const updated = getOne('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// DELETE /api/sessions/:id — delete session (cascade)
router.delete('/:id', (req, res) => {
  try {
    const session = getOne('SELECT * FROM sessions WHERE id = ?', [req.params.id]);

    if (!session) {
      return res.status(404).json({ error: true, message: 'Session not found' });
    }

    // Foreign keys with CASCADE handle messages and switches
    run('DELETE FROM sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
