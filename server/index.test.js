import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from './index.js';
 
// helper: เปิด server ชั่วคราวบน port สุ่ม แล้วปิดทิ้งเมื่อจบ test
async function withServer(fn) {
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  
  try {
    await fn(base);
  } finally {
    // 1. บังคับเตะ Connection ที่ fetch เปิดค้างไว้ออกให้หมด (จุดสำคัญ!)
    server.closeAllConnections(); 
    
    // 2. รอจนกว่า Server จะปิดสนิทจริงๆ แล้วค่อยไปเทสข้อต่อไป
    await new Promise(resolve => server.close(resolve));
  }
}
 
test('GET / returns service status', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'boardgame-api');
  });
});
 
test('DELETE /bookings/:id rejects non-numeric id (400)', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/bookings/abc`, { method: 'DELETE' });
    assert.equal(r.status, 400);
    const body = await r.json();
    assert.equal(body.error, 'invalid_id');
  });
});
 
test('DELETE /bookings/:id rejects zero and negative id (400)', async () => {
  await withServer(async (base) => {
    for (const bad of ['0', '-5']) {
      const r = await fetch(`${base}/bookings/${bad}`, { method: 'DELETE' });
      assert.equal(r.status, 400, `expected 400 for id=${bad}`);
    }
  });
});