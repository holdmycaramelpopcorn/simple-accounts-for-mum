import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sanitizeAmount(value) {
  if (value === '' || value === null || value === undefined) return '';
  value = String(value).replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  if (parts.length > 1) {
    const decimals = parts.slice(1).join('');
    return parts[0] + '.' + decimals.slice(0, 2);
  }
  return parts[0];
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', type: '', search: '' });
  const [newEntry, setNewEntry] = useState({ date: '', particulars: '', type: 'Credit', comments: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadFlag, setReloadFlag] = useState(0);

  useEffect(() => {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    :root{
      --bg-1: #f8fafc;
      --card: #ffffff;
      --muted: #6b7280;
      --accent-1: #7c3aed;
      --accent-2: #06b6d4;
      --success-start: #10b981;
      --success-end: #059669;
    }
    html,body,#root{height:100%;}
    body{margin:0;background:linear-gradient(180deg,#f1f5f9 0%, #eef2ff 100%);font-family:Inter,system-ui,Arial,sans-serif;color:#111827}
    .app-container{max-width:1100px;margin:28px auto;padding:20px}
    .site-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
    .brand{display:flex;flex-direction:column}
    .brand h1{margin:0;font-size:26px;color:var(--accent-1);letter-spacing:-0.5px}
    .brand p{margin:0;color:var(--muted);font-size:13px}

    .top-controls{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
    .card{background:var(--card);padding:14px;border-radius:12px;box-shadow:0 8px 24px rgba(16,24,40,0.06);border:1px solid rgba(99,102,241,0.06)}

    .filters {
    display: grid;
    gap: 10px;
    /* Bigger min to avoid desktop overlap, auto-fill for wrapping */
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    
    .form-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    align-items: center;
    }
    
    input[type="text"], input[type="date"], input[type="number"], select {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #e6edf3;
    font-size: 14px;
    min-width: 0; /* Allow shrinking inside grid cell */
    }


    .btn{display:inline-flex;align-items:center;gap:8px;border:0;padding:10px 14px;border-radius:10px;cursor:pointer}
    .btn-primary{background:linear-gradient(90deg,var(--success-start),var(--success-end));color:white;box-shadow:0 8px 18px rgba(5,150,105,0.12)}
    .btn-ghost{background:transparent;border:1px solid rgba(17,24,39,0.06)}

    .table-wrap{overflow:hidden;border-radius:12px}
    table.app-table{width:100%;border-collapse:separate;border-spacing:0}
    thead th{padding:12px;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:white;text-align:left;font-weight:600;font-size:13px}
    tbody tr{background:var(--card)}
    td, th{border-bottom:1px solid rgba(15,23,42,0.04)}
    td{padding:10px;vertical-align:middle}
    td .cell-input{width:100%;padding:8px;border-radius:8px;border:1px solid #e6edf3}
    .amount, .balance{font-variant-numeric: tabular-nums;text-align:right}
    .balance{font-weight:700;color:#111827}

    .actions{display:flex;gap:8px;justify-content:center}
    .delete-btn{background:#ef4444;color:white;padding:8px 10px;border-radius:8px;border:0}

    @media(max-width:720px){
      thead{display:none}
      table.app-table, table.app-table tbody, table.app-table tr, table.app-table td{display:block;width:100%}
      table.app-table tr{margin:10px 0;padding:12px;border-radius:10px;box-shadow:0 6px 18px rgba(16,24,40,0.04);border:1px solid rgba(15,23,42,0.03)}
      table.app-table td{display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:none}
      table.app-table td::before{content:attr(data-label);color:var(--muted);font-weight:600;margin-right:8px}
      .amount, .balance{text-align:right}
    }

    .empty{padding:30px;text-align:center;color:var(--muted)}

    .footer-note{color:var(--muted);font-size:13px;margin-top:8px;text-align:center}

    @media(max-width:480px){
      .form-grid button {
        width: 100%;
      }
    }
  `;
  const tag = document.createElement('style');
  tag.setAttribute('data-generated', 'polished-ui');
  tag.innerHTML = css;
  document.head.appendChild(tag);
  return () => {
    try { document.head.removeChild(tag); } catch (e) {}
  };
}, []);

  async function fetchEntries() {
    try {
      setLoading(true);
      setError('');
      let q = supabase.from('expenses').select('*').order('date', { ascending: true }).order('id', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      setEntries((data || []).map(d => ({ ...d, amount: Number(d.amount), balance: Number(d.balance) })));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  async function recalcAndPersist(rows) {
    let running = 0;
    const recalculated = rows.map(r => {
      running += r.type === 'Credit' ? Number(r.amount) : -Number(r.amount);
      return { ...r, balance: running };
    });
    const updates = recalculated.filter((r, i) => Number(rows[i].balance) !== Number(r.balance)).map(r => ({ id: r.id, balance: r.balance }));
    if (updates.length > 0) {
      await Promise.all(updates.map(u => supabase.from('expenses').update({ balance: u.balance }).eq('id', u.id)));
      await fetchEntries();
    } else {
      setEntries(recalculated);
    }
  }

  useEffect(() => { fetchEntries(); }, [reloadFlag]);

  useEffect(() => { if (entries.length > 0) recalcAndPersist(entries); }, [entries.length]);

  async function handleAdd() {
    setError('');
    if (!newEntry.date || !newEntry.particulars || newEntry.amount === '') { setError('Please enter date, particulars and amount'); return; }
    try {
      setLoading(true);
      const payload = { ...newEntry, amount: Number(newEntry.amount) };
      await supabase.from('expenses').insert([payload]);
      setNewEntry({ date: '', particulars: '', type: 'Credit', comments: '', amount: '' });
      setReloadFlag(f => f + 1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Add failed');
    } finally { setLoading(false); }
  }

  async function handleUpdate(id, field, value) {
    setError('');
    try {
      if (field === 'amount') value = sanitizeAmount(value);
      const payload = field === 'amount' ? { [field]: value === '' ? 0 : Number(value) } : { [field]: value };
      await supabase.from('expenses').update(payload).eq('id', id);
      setReloadFlag(f => f + 1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Update failed');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return;
    try {
      await supabase.from('expenses').delete().eq('id', id);
      setReloadFlag(f => f + 1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Delete failed');
    }
  }

  const filtered = entries.filter(e => {
    if (filters.startDate && new Date(e.date) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(e.date) > new Date(filters.endDate)) return false;
    if (filters.type && e.type !== filters.type) return false;
    if (filters.search && !e.particulars.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="app-container">
      <div className="site-header">
        <div className="brand">
          <h1>Expense Tracker</h1>
          <p>Quick, beautiful, and mobile-friendly — tracks balance automatically.</p>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,color:'#374151'}}>Entries: <strong>{entries.length}</strong></div>
          <div style={{fontSize:12,color:'#374151'}}>Filtered: <strong>{filtered.length}</strong></div>
        </div>
      </div>

      <div className="top-controls">
        <div className="card" style={{ flex: '1 1 460px' }}>
  {/* Filters header row */}
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    }}
  >
    <div style={{ fontWeight: 700 }}>Filters</div>
    <button
      className="btn btn-ghost"
      onClick={() =>
        setFilters({ startDate: '', endDate: '', type: '', search: '' })
      }
    >
      Clear
    </button>
  </div>

  {/* Filters grid */}
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '8px',
    }}
  >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
      }}
    >
      <input
        type="date"
        value={filters.startDate}
        onChange={(e) =>
          setFilters({ ...filters, startDate: e.target.value })
        }
      />
      <input
        type="date"
        value={filters.endDate}
        onChange={(e) =>
          setFilters({ ...filters, endDate: e.target.value })
        }
      />
    </div>

    <select
      value={filters.type}
      onChange={(e) =>
        setFilters({ ...filters, type: e.target.value })
      }
    >
      <option value="">All</option>
      <option value="Credit">Credit</option>
      <option value="Debit">Debit</option>
    </select>
    <input
      type="text"
      placeholder="Search particulars"
      value={filters.search}
      onChange={(e) =>
        setFilters({ ...filters, search: e.target.value })
      }
    />
  </div>
</div>



        <div className="card" style={{flex:'1 1 420px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontWeight:700}}>Add Entry</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>Credit adds, Debit subtracts</div>
          </div>
          <div className="form-grid">
            <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry,date:e.target.value})} />
            <input type="text" placeholder="Particulars" value={newEntry.particulars} onChange={e => setNewEntry({...newEntry,particulars:e.target.value})} />
            <select value={newEntry.type} onChange={e => setNewEntry({...newEntry,type:e.target.value})}>
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </select>
            <input type="text" placeholder="Comments (optional)" value={newEntry.comments} onChange={e => setNewEntry({...newEntry,comments:e.target.value})} />
            <input type="text" inputMode="decimal" placeholder="Amount" value={newEntry.amount} onChange={e => setNewEntry({...newEntry,amount:sanitizeAmount(e.target.value)})} />
            <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-ghost" onClick={() => setNewEntry({ date: '', particulars: '', type: 'Credit', comments: '', amount: '' })}>Reset</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>{loading ? 'Saving...' : 'Add Entry'}</button>
            </div>
          </div>
          {error && <div style={{color:'#ef4444',marginTop:8}}>{error}</div>}
        </div>
      </div>

      <div className="card table-wrap" style={{overflow:'visible'}}>
        <table className="app-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Particulars</th>
              <th>Type</th>
              <th>Comments</th>
              <th style={{textAlign:'right'}}>Amount</th>
              <th style={{textAlign:'right'}}>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty">No entries yet — add your first expense!</div></td></tr>
            )}
            {filtered.map(row => (
              <tr key={row.id}>
                <td data-label="Date"><input className="cell-input" type="date" value={row.date} onChange={e => handleUpdate(row.id, 'date', e.target.value)} /></td>
                <td data-label="Particulars"><input className="cell-input" type="text" value={row.particulars} onChange={e => handleUpdate(row.id, 'particulars', e.target.value)} /></td>
                <td data-label="Type">
                  <select className="cell-input" value={row.type} onChange={e => handleUpdate(row.id, 'type', e.target.value)}>
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                  </select>
                </td>
                <td data-label="Comments"><input className="cell-input" type="text" value={row.comments || ''} onChange={e => handleUpdate(row.id, 'comments', e.target.value)} /></td>
                <td data-label="Amount" className="amount"><input className="cell-input" type="text" inputMode="decimal" value={String(row.amount)} onChange={e => handleUpdate(row.id, 'amount', sanitizeAmount(e.target.value))} /></td>
                <td data-label="Balance" className="balance">{Number(row.balance).toFixed(2)}</td>
                <td data-label="Actions" className="actions"><button className="delete-btn" onClick={() => handleDelete(row.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer-note">Designed for quick use — works on phones, tablets and desktop. Want CSV export, categories, or a dark mode? I can add that next.</div>
    </div>
  );
}
