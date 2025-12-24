// ld2030/v1/actions/events.js
// GET /events feed (seq-ordered, beforeSeq paging)

module.exports = function registerEvents(app, { reader, base } = {}) {
  if (!app) throw new Error('events: app is required');
  if (!reader || typeof reader.listEvents !== 'function') {
    throw new Error('events: reader.listEvents is required');
  }

  const BASE = String(base || '').trim() || '/api/ld2030/v1';

  app.get(`${BASE}/events`, async (req, res) => {
    try {
      const gameId = String(req.query.gameId || 'lockdown2030').trim();
      const limitRaw = req.query.limit;
      const beforeRaw = req.query.beforeSeq;

      const limit = limitRaw === undefined ? undefined : Number(limitRaw);
      const beforeSeq = beforeRaw === undefined ? null : Number(beforeRaw);

      const events = await reader.listEvents(gameId, { limit, beforeSeq });

      return res.json({ ok: true, gameId, events });
    } catch (e) {
      console.error('events error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'events_failed') });
    }
  });
};