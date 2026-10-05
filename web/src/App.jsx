import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [boardgames, setBoardgames] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to generate the next 7 days dynamically on render
  const getAvailableDates = () => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const value = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const display = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      return { 
        value, 
        label: i === 0 ? `Today (${display})` : i === 1 ? `Tomorrow (${display})` : display 
      };
    });
  };

  const availableDates = getAvailableDates();
  
  // Generate hours for dropdowns (10:00 to 22:00)
  const hoursOptions = Array.from({length: 13}).map((_, i) => {
    const h = (10 + i).toString().padStart(2, '0') + ':00:00';
    return { value: h, label: `${10 + i}:00` };
  });

  // Form state
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

  const openBookingModal = (g) => {
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
        headers: { 'Content-Type': 'application/json' },
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
      setSelectedGame(null); // Close modal
      await load();
    } catch (e) {
      // Show custom message if provided by backend, else generic error
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
      const r = await fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' });
      if (!r.ok) throw await r.json().catch(() => ({ error: 'http_error' }));
      await load();
    } catch (e) {
      setError(e.error || 'failed_to_cancel');
    } finally {
      setCancellingId(null);
    }
  }

  // Check if chosen time range overlaps with any existing booking for the selected game
  function isTimeRangeBooked(startStr, endStr) {
    if (!selectedGame || !form.date) return false;
    try {
      const targetStart = new Date(`${form.date}T${startStr}`);
      const targetEnd = new Date(`${form.date}T${endStr}`);
      
      if (targetEnd <= targetStart) return true; // Invalid range
      
      return bookings.some(b => {
        if (b.game_id !== selectedGame.id) return false;
        const bStart = new Date(b.slot);
        const bEnd = new Date(b.end_time || new Date(bStart.getTime() + 2*60*60*1000));
        // Overlap condition: bStart < targetEnd AND bEnd > targetStart
        return (bStart < targetEnd && bEnd > targetStart);
      });
    } catch (e) {
      return false; // invalid date input
    }
  }

  const isInvalidRange = form.start_time >= form.end_time;
  const isBooked = isTimeRangeBooked(form.start_time, form.end_time);
  
  return (
    <div className="container">
      <header className="header">
        <h1>Meeple's Board Game Cafe 🎲</h1>
        <p>Reserve a table & your favorite board games to play with friends!</p>
      </header>

      {loading && <p>Loading…</p>}
      {error && !selectedGame && <div className="error-msg">Error: {error}</div>}

      <section>
        <h2 style={{ marginBottom: '1.5rem' }}>Available Games (Click to Reserve)</h2>
        {boardgames.length === 0 ? (
          <p>(no games — load schema.sql + seed-data.sql first)</p>
        ) : (
          <div className="games-grid">
            {boardgames.map(g => (
              <div key={g.id} className="game-card" onClick={() => openBookingModal(g)}>
                {g.image_url && <img src={g.image_url} alt={g.name} className="game-img" />}
                <div className="game-info">
                  <h3>{g.name}</h3>
                  <p>{g.category}</p>
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
                {bookings.map(b => (
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
                      <button 
                        className="btn-danger"
                        onClick={() => onCancel(b.id)} 
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? '...' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Booking Modal */}
      {selectedGame && (
        <div className="modal-overlay" onClick={() => setSelectedGame(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGame(null)}>×</button>
            
            <div className="modal-header">
              {selectedGame.image_url && <img src={selectedGame.image_url} alt={selectedGame.name} />}
              <div>
                <h2>{selectedGame.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedGame.category}</p>
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
