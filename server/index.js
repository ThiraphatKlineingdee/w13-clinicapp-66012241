import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { getSqlPool } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-boardgame';

app.use(cors());
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'unauthorized', message: 'กรุณาล็อกอินก่อนทำรายการ' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'forbidden', message: 'เซสชั่นหมดอายุ กรุณาล็อกอินใหม่' });
    req.user = user;
    next();
  });
}

app.get('/', (_req, res) => res.json({ ok: true, service: 'boardgame-api' }));

// POST /register
app.post('/register', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const pool = await getSqlPool();
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.request()
      .input('u', sql.NVarChar(50), username)
      .input('p', sql.NVarChar(255), hash)
      .query(`
        INSERT INTO users (username, password_hash) 
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.role 
        VALUES (@u, @p)
      `);
    res.status(201).json(r.recordset[0]);
  } catch (e) {
    if (e.message.includes('Violation of UNIQUE KEY constraint')) {
      return res.status(409).json({ error: 'username_taken', message: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' });
    }
    next(e);
  }
});

// POST /login
app.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};
  try {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('u', sql.NVarChar(50), username)
      .query('SELECT * FROM users WHERE username = @u');
    
    if (r.recordset.length === 0) return res.status(400).json({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    
    const user = r.recordset[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) { next(e); }
});

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
      SELECT b.id, b.player_name, b.slot, b.end_time, b.user_id, g.name AS game_name, g.category, g.image_url
      FROM bookings b JOIN boardgames g ON b.game_id = g.id
      ORDER BY b.slot
    `);
    res.json(r.recordset);
  } catch (e) { next(e); }
});

app.post('/bookings', authenticateToken, async (req, res, next) => {
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
      .input('user_id', sql.Int, req.user.id)
      .query(`
        INSERT INTO bookings (game_id, player_name, slot, end_time, user_id)
        OUTPUT INSERTED.id, INSERTED.game_id, INSERTED.player_name, INSERTED.slot, INSERTED.end_time, INSERTED.user_id
        VALUES (@game_id, @player_name, @slot, @end_time, @user_id)
      `);
    res.status(201).json(r.recordset[0]);
  } catch (e) { next(e); }
});

// delete booking by id
app.delete('/bookings/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'unauthorized', message: 'กรุณาล็อกอินก่อนทำรายการ' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'forbidden', message: 'เซสชั่นหมดอายุ กรุณาล็อกอินใหม่' });
    req.user = user;

    try {
      const pool = await getSqlPool();
      
      // Check ownership or admin
      const checkR = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT user_id FROM bookings WHERE id = @id');
        
      if (checkR.recordset.length === 0) return res.status(404).json({ error: 'not_found' });
      
      const booking = checkR.recordset[0];
      if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
        return res.status(403).json({ error: 'forbidden', message: 'คุณไม่มีสิทธิ์ลบรายการนี้' });
      }

      const r = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM bookings WHERE id = @id');
        
      if (r.rowsAffected[0] === 0) {
        return res.status(404).json({ error: 'not_found' });
      }
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
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
export default app;
