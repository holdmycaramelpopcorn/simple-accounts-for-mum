import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', type: '', search: '' });
  const [newEntry, setNewEntry] = useState({ date: '', particulars: '', type: 'Credit', comments: '', amount: '' });

  const fetchEntries = async () => {
    let query = supabase.from('expenses').select('*').order('date', { ascending: true });
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.search) query = query.ilike('particulars', `%${filters.search}%`);
    const { data } = await query;
    setEntries(data || []);
  };

  const recalcBalances = async () => {
    let balance = 0;
    const updated = entries.map(e => {
      balance += e.type === 'Credit' ? Number(e.amount) : -Number(e.amount);
      return { ...e, balance };
    });
    for (const e of updated) {
      await supabase.from('expenses').update({ balance: e.balance }).eq('id', e.id);
    }
    setEntries(updated);
  };

  const addEntry = async () => {
    if (!newEntry.date || !newEntry.particulars || !newEntry.amount) return;
    await supabase.from('expenses').insert([{ ...newEntry, amount: Number(newEntry.amount) }]);
    setNewEntry({ date: '', particulars: '', type: 'Credit', comments: '', amount: '' });
    fetchEntries();
  };

  const updateEntry = async (id, field, value) => {
    await supabase.from('expenses').update({ [field]: value }).eq('id', id);
    fetchEntries();
  };

  const deleteEntry = async id => {
    await supabase.from('expenses').delete().eq('id', id);
    fetchEntries();
  };

  useEffect(() => { fetchEntries(); }, [filters]);
  useEffect(() => { recalcBalances(); }, [entries.length]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-700">Expense Tracker</h1>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="border p-2 rounded w-full" />
          <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="border p-2 rounded w-full" />
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="border p-2 rounded w-full">
            <option value="">All</option>
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
          <input type="text" placeholder="Search particulars" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="border p-2 rounded w-full" />
        </div>

        {/* Add Entry */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} className="border p-2 rounded" />
          <input type="text" placeholder="Particulars" value={newEntry.particulars} onChange={e => setNewEntry({ ...newEntry, particulars: e.target.value })} className="border p-2 rounded" />
          <select value={newEntry.type} onChange={e => setNewEntry({ ...newEntry, type: e.target.value })} className="border p-2 rounded">
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
          <input type="text" placeholder="Comments" value={newEntry.comments} onChange={e => setNewEntry({ ...newEntry, comments: e.target.value })} className="border p-2 rounded" />
          <input type="number" step="0.01" min="0" inputMode="decimal" pattern="\\d*" placeholder="Amount" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} className="border p-2 rounded" />
        </div>
        <button onClick={addEntry} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow">Add Entry</button>

        {/* Entries Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full table-auto border-collapse text-sm sm:text-base">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Particulars</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Comments</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2 text-right">Balance</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="border p-1"><input type="date" value={entry.date} onChange={e => updateEntry(entry.id, 'date', e.target.value)} className="border p-1 rounded w-full" /></td>
                  <td className="border p-1"><input type="text" value={entry.particulars} onChange={e => updateEntry(entry.id, 'particulars', e.target.value)} className="border p-1 rounded w-full" /></td>
                  <td className="border p-1">
                    <select value={entry.type} onChange={e => updateEntry(entry.id, 'type', e.target.value)} className="border p-1 rounded w-full">
                      <option value="Credit">Credit</option>
                      <option value="Debit">Debit</option>
                    </select>
                  </td>
                  <td className="border p-1"><input type="text" value={entry.comments || ''} onChange={e => updateEntry(entry.id, 'comments', e.target.value)} className="border p-1 rounded w-full" /></td>
                  <td className="border p-1 text-right"><input type="number" step="0.01" min="0" inputMode="decimal" pattern="\\d*" value={entry.amount} onChange={e => updateEntry(entry.id, 'amount', e.target.value)} className="border p-1 rounded w-full text-right" /></td>
                  <td className="border p-1 text-right">{entry.balance}</td>
                  <td className="border p-1 text-center">
                    <button onClick={() => deleteEntry(entry.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
