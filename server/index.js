import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { getSqlPool } from './db.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ ok: true, service: 'boardgame-api' }));

app.get('/boardgames', async (_req, res, next) => {
  try {
    const pool = await getSqlPool();
    const r = await pool.request()
      .query('SELECT id, name, category, image_url FROM boardgames ORDER BY name');
    res.json(r.recordset);
  } catch (e) { next(e); }
});

app.get('/bookings', async (_req, res, next) => {
  try {
    const pool = await getSqlPool();
    const r = await pool.request().query(`
      SELECT b.id, b.player_name, b.slot, b.end_time, g.name AS game_name, g.category, g.image_url
      FROM bookings b JOIN boardgames g ON b.game_id = g.id
      ORDER BY b.slot
    `);
    res.json(r.recordset);
  } catch (e) { next(e); }
});

app.post('/bookings', async (req, res, next) => {
  const { game_id, player_name, start_time, end_time } = req.body || {};
  if (!game_id || !player_name || !start_time || !end_time) {
    return res.status(400).json({ error: 'game_id, player_name, start_time, end_time are required' });
  }
  try {
    const pool = await getSqlPool();
    const targetStart = new Date(start_time);
    const targetEnd = new Date(end_time);

    if (targetEnd <= targetStart) {
      return res.status(400).json({ error: 'invalid_duration', message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม' });
    }
    
    // Check for overlapping bookings
    // Overlap condition: existing.start < new.end AND existing.end > new.start
    const checkR = await pool.request()
      .input('game_id', sql.Int, Number(game_id))
      .input('new_start', sql.DateTime2, targetStart)
      .input('new_end', sql.DateTime2, targetEnd)
      .query(`
        SELECT id FROM bookings 
        WHERE game_id = @game_id 
        AND slot < @new_end 
        AND end_time > @new_start
      `);
      
    if (checkR.recordset.length > 0) {
      return res.status(409).json({ error: 'already_booked', message: 'ช่วงเวลานี้มีคนจองเกมนี้ไปแล้วครับ' });
    }

    const r = await pool.request()
      .input('game_id', sql.Int, Number(game_id))
      .input('player_name', sql.NVarChar(200), String(player_name))
      .input('slot', sql.DateTime2, targetStart)
      .input('end_time', sql.DateTime2, targetEnd)
      .query(`
        INSERT INTO bookings (game_id, player_name, slot, end_time)
        OUTPUT INSERTED.id, INSERTED.game_id, INSERTED.player_name, INSERTED.slot, INSERTED.end_time
        VALUES (@game_id, @player_name, @slot, @end_time)
      `);
    res.status(201).json(r.recordset[0]);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  if (err.code === 'NO_DB_CONFIG') {
    return res.status(503).json({
      error: 'database_not_configured',
      hint: 'Set AZURE_SQL_CONNECTION_STRING environment variable'
    });
  }
  console.error('unhandled', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

const isDirectRun = process.argv[1] && process.argv[1].endsWith('index.js');
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`boardgame-api listening on :${PORT}`);
  });
}
// delete booking by id
app.delete('/bookings/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  try {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM bookings WHERE id = @id');
    if (r.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
export default app;
