import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [boardgames, setBoardgames] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth State
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState(null);

  // Add Game State
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [addGameForm, setAddGameForm] = useState({ name: '', category: '', image_url: '', quantity: 1 });
  const [addingGame, setAddingGame] = useState(false);

  // Helper to generate the next 7 days dynamically on render
  const getAvailableDates = () => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const value = d.toISOString().split('T')[0];
      const display = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      return { 
        value, 
        label: i === 0 ? `Today (${display})` : i === 1 ? `Tomorrow (${display})` : display 
      };
    });
  };

  const availableDates = getAvailableDates();
  
  const hoursOptions = Array.from({length: 13}).map((_, i) => {
    const h = (10 + i).toString().padStart(2, '0') + ':00:00';
    return { value: h, label: `${10 + i}:00` };
  });

  // Booking Form state
  const [selectedGame, setSelectedGame] = useState(null);
  const [form, setForm] = useState({ date: availableDates[0].value, start_time: '10:00:00', end_time: '12:00:00', player_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  async function load() {
    try {
      setError(null);
      const [g, b] = await Promise.all([
        fetch(`${API_BASE}/boardgames`).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
        fetch(`${API_BASE}/bookings`).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
      ]);
      setBoardgames(g);
      setBookings(b);
    } catch (e) {
      setError(e.error || 'failed_to_load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user, token]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw data;

      if (isRegistering) {
        alert('สมัครสมาชิกสำเร็จ กรุณาล็อกอิน');
        setIsRegistering(false);
        setAuthForm(f => ({ ...f, password: '' }));
      } else {
        setToken(data.token);
        setUser(data.user);
        setShowAuthModal(false);
      }
    } catch (e) {
      setAuthError(e.message || e.error || 'auth_failed');
    }
  };

  const handleAddGameSubmit = async (e) => {
    e.preventDefault();
    setAddingGame(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/boardgames`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addGameForm)
      });
      if (!r.ok) throw await r.json().catch(() => ({ error: 'http_error' }));
      
      setAddGameForm({ name: '', category: '', image_url: '', quantity: 1 });
      setShowAddGameModal(false);
      await load(); // Reload grid
    } catch (e) {
      alert(e.message || e.error || 'failed_to_add_game');
    } finally {
      setAddingGame(false);
    }
  };

  const openBookingModal = (g) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedGame(g);
    setError(null);
    setForm(f => ({ ...f, date: getAvailableDates()[0].value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedGame || !form.date) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const startSlot = new Date(`${form.date}T${form.start_time}`).toISOString();
      const endSlot = new Date(`${form.date}T${form.end_time}`).toISOString();
      
      const r = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_id: selectedGame.id,
          player_name: form.player_name,
          start_time: startSlot,
          end_time: endSlot
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: 'http_error' }));
        throw e;
      }
      setForm({ date: getAvailableDates()[0].value, start_time: '10:00:00', end_time: '12:00:00', player_name: '' });
      setSelectedGame(null);
      await load();
    } catch (e) {
      setError(e.message || e.error || 'failed_to_reserve');
    } finally {
      setSubmitting(false);
    }
  }
  
  async function onCancel(id) {
    if (!confirm('Cancel this reservation?')) return;
    setCancellingId(id);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/bookings/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) throw await r.json().catch(() => ({ error: 'http_error' }));
      await load();
    } catch (e) {
      alert(e.message || e.error || 'failed_to_cancel');
    } finally {
      setCancellingId(null);
    }
  }

  function isTimeRangeBooked(startStr, endStr) {
    if (!selectedGame || !form.date) return false;
    try {
      const targetStart = new Date(`${form.date}T${startStr}`);
      const targetEnd = new Date(`${form.date}T${endStr}`);
      
      if (targetEnd <= targetStart) return true;
      
      const overlaps = bookings.filter(b => {
        if (b.game_id !== selectedGame.id) return false;
        const bStart = new Date(b.slot);
        const bEnd = new Date(b.end_time || new Date(bStart.getTime() + 2*60*60*1000));
        return (bStart < targetEnd && bEnd > targetStart);
      });
      return overlaps.length >= (selectedGame.quantity || 1);
    } catch (e) {
      return false;
    }
  }

  const isInvalidRange = form.start_time >= form.end_time;
  const isBooked = isTimeRangeBooked(form.start_time, form.end_time);
  
  return (
    <div className="container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h1>Meeple's Board Game Cafe 🎲</h1>
          <p>Reserve a table & your favorite board games to play with friends!</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {user ? (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                👤 {user.username} {user.role === 'admin' && <span style={{color:'gold'}}>(Admin)</span>}
              </p>
              <button className="btn-danger" onClick={handleLogout} style={{ padding: '0.4rem 1rem' }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)}>Login / Register</button>
          )}
        </div>
      </header>

      {loading && <p>Loading…</p>}
      {error && !selectedGame && <div className="error-msg">Error: {error}</div>}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Available Games (Click to Reserve)</h2>
          {user && user.role === 'admin' && (
            <button 
              style={{ width: 'auto', background: '#10b981', color: 'white' }} 
              onClick={() => setShowAddGameModal(true)}
            >
              ➕ Add New Game
            </button>
          )}
        </div>
        
        {boardgames.length === 0 ? (
          <p>(no games — load schema.sql + seed-data.sql first)</p>
        ) : (
          <div className="games-grid">
            {boardgames.map(g => (
              <div key={g.id} className="game-card" onClick={() => openBookingModal(g)}>
                {g.image_url && <img src={g.image_url} alt={g.name} className="game-img" />}
                <div className="game-info">
                  <h3>{g.name}</h3>
                  <p>{g.category} • {g.quantity || 1} กล่อง</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: '1.5rem' }}>Current Reservations (All Games)</h2>
        {bookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No reservations yet. Be the first!</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player / Group Name</th>
                  <th>Game Reserved</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const canCancel = user && (user.role === 'admin' || user.id === b.user_id);
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong>{new Date(b.slot).toLocaleDateString('en-US')}</strong><br/>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(b.slot).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {b.end_time ? ` - ${new Date(b.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      </td>
                      <td>{b.player_name}</td>
                      <td>
                        <div className="booking-game">
                          {b.image_url && <img src={b.image_url} alt={b.game_name} className="booking-thumb" />}
                          <div>
                            <div style={{ fontWeight: 500 }}>{b.game_name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {canCancel ? (
                          <button 
                            className="btn-danger"
                            onClick={() => onCancel(b.id)} 
                            disabled={cancellingId === b.id}
                          >
                            {cancellingId === b.id ? '...' : 'Cancel'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Permission</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Game Modal */}
      {showAddGameModal && (
        <div className="modal-overlay" onClick={() => setShowAddGameModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddGameModal(false)}>×</button>
            <h2 style={{ marginTop: 0 }}>➕ Add New Game</h2>
            
            <form onSubmit={handleAddGameSubmit} className="form-grid" style={{ marginTop: '1.5rem' }}>
              <div className="form-group-full">
                <label>Game Name</label>
                <input 
                  type="text" 
                  value={addGameForm.name} 
                  onChange={e => setAddGameForm(f => ({...f, name: e.target.value}))} 
                  required 
                  placeholder="e.g. Catan"
                />
              </div>
              <div>
                <label>Category</label>
                <input 
                  type="text" 
                  value={addGameForm.category} 
                  onChange={e => setAddGameForm(f => ({...f, category: e.target.value}))} 
                  required 
                  placeholder="e.g. Strategy"
                />
              </div>
              <div>
                <label>Quantity (Boxes)</label>
                <input 
                  type="number" 
                  min="1"
                  value={addGameForm.quantity} 
                  onChange={e => setAddGameForm(f => ({...f, quantity: Number(e.target.value)}))} 
                  required 
                />
              </div>
              <div className="form-group-full">
                <label>Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={addGameForm.image_url} 
                  onChange={e => setAddGameForm(f => ({...f, image_url: e.target.value}))} 
                  placeholder="/images/catan.jpg หรือ URL รูปภาพ"
                />
              </div>
              <div className="form-group-full" style={{ marginTop: '1rem' }}>
                <button type="submit" disabled={addingGame} style={{ background: '#10b981', color: 'white' }}>
                  {addingGame ? 'Adding...' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
            <h2 style={{ marginTop: 0 }}>{isRegistering ? 'Register' : 'Login'}</h2>
            
            {authError && <div className="error-msg">⚠️ {authError}</div>}
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                  value={authForm.username} 
                  onChange={e => setAuthForm(f => ({...f, username: e.target.value}))} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                <input 
                  type="password" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
                  value={authForm.password} 
                  onChange={e => setAuthForm(f => ({...f, password: e.target.value}))} 
                  required 
                />
              </div>
              <button type="submit" style={{ marginTop: '1rem' }}>
                {isRegistering ? 'Sign Up' : 'Sign In'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                {isRegistering ? "Already have an account? " : "Don't have an account? "}
                <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); setAuthError(null); }} style={{ color: 'var(--primary-color)' }}>
                  {isRegistering ? 'Login here' : 'Register here'}
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedGame && user && (
        <div className="modal-overlay" onClick={() => setSelectedGame(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGame(null)}>×</button>
            
            <div className="modal-header">
              {selectedGame.image_url && <img src={selectedGame.image_url} alt={selectedGame.name} />}
              <div>
                <h2>{selectedGame.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedGame.category} • {selectedGame.quantity || 1} กล่อง
                </p>
              </div>
            </div>

            {error && <div className="error-msg">⚠️ {error}</div>}

            <form onSubmit={onSubmit} className="form-grid">
              <div className="form-group-full">
                <label>Date</label>
                <select
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                >
                  {availableDates.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Start Time</label>
                <select
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  required
                >
                  {hoursOptions.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div>
                <label>End Time</label>
                <select
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  required
                >
                  {hoursOptions.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div className="form-group-full">
                <label>Player Name / Group Name</label>
                <input
                  type="text"
                  value={form.player_name}
                  onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))}
                  placeholder="e.g. Kong & Friends (4 pax)"
                  required
                />
              </div>
              <div className="form-group-full" style={{ marginTop: '1rem' }}>
                <button type="submit" disabled={submitting || isInvalidRange || isBooked}>
                  {submitting ? 'Reserving…' : 
                   isInvalidRange ? 'Invalid Time Range' :
                   isBooked ? 'Slot Not Available (Overlaps)' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
