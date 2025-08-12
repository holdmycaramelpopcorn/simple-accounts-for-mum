import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    date: "",
    particulars: "",
    type: "Credit",
    comments: "",
    amount: "",
  });
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: "",
    type: "",
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    let query = supabase.from("expenses").select("*").order("date", { ascending: true });

    if (filters.startDate) query = query.gte("date", filters.startDate);
    if (filters.endDate) query = query.lte("date", filters.endDate);
    if (filters.search) query = query.ilike("particulars", `%${filters.search}%`);
    if (filters.type) query = query.eq("type", filters.type);

    const { data } = await query;
    setEntries(data || []);
  }

  async function addEntry(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount)) return;

    await supabase.from("expenses").insert([{ ...form, amount }]);
    setForm({ date: "", particulars: "", type: "Credit", comments: "", amount: "" });
    fetchEntries();
  }

  async function deleteEntry(id) {
    await supabase.from("expenses").delete().eq("id", id);
    fetchEntries();
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
          Expense Tracker
        </h1>

        {/* Add Entry Form */}
        <form
          onSubmit={addEntry}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6"
        >
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded p-2 w-full"
            required
          />
          <input
            type="text"
            value={form.particulars}
            onChange={(e) => setForm({ ...form, particulars: e.target.value })}
            placeholder="Particulars"
            className="border rounded p-2 w-full"
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border rounded p-2 w-full"
          >
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
          <input
            type="text"
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="Comments"
            className="border rounded p-2 w-full"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Amount"
            className="border rounded p-2 w-full"
            required
          />
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
          >
            Add Entry
          </button>
        </form>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded p-2 w-full"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search Particulars"
            className="border rounded p-2 w-full"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="border rounded p-2 w-full"
          >
            <option value="">All</option>
            <option value="Credit">Credit</option>
            <option value="Debit">Debit</option>
          </select>
        </div>
        <button
          onClick={fetchEntries}
          className="mb-6 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          Apply Filters
        </button>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-indigo-100">
                <th className="border p-2">Date</th>
                <th className="border p-2">Particulars</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Comments</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2">{entry.date}</td>
                  <td className="border p-2">{entry.particulars}</td>
                  <td className="border p-2">{entry.type}</td>
                  <td className="border p-2">{entry.comments}</td>
                  <td className="border p-2">{entry.amount}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
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
