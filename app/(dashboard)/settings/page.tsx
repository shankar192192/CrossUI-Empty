"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Loader2, Plus, X } from "lucide-react";
import type { LeadSource } from "@/lib/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALESPERSON");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [newSourceName, setNewSourceName] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [usersRes, sourcesRes] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/lead-sources").then((r) => r.json()),
    ]);
    setUsers(usersRes.users ?? []);
    setLeadSources(sourcesRes.leadSources ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addLeadSource(e: React.FormEvent) {
    e.preventDefault();
    setSourceError(null);
    if (!newSourceName.trim()) return;
    const res = await fetch("/api/lead-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSourceName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSourceError(data.error ?? "Something went wrong");
      return;
    }
    setLeadSources((prev) => [...prev, data.leadSource].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSourceName("");
  }

  async function deleteLeadSource(id: string) {
    setLeadSources((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/lead-sources/${id}`, { method: "DELETE" });
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      setRole("SALESPERSON");
      setSubmitting(false);
      load();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your team</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Lead sources</h2>
        {sourceError && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-3">{sourceError}</div>
        )}
        <div className="space-y-1.5 mb-3">
          {leadSources.length === 0 && <p className="text-sm text-slate-400">No lead sources yet — add one below.</p>}
          {leadSources.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-800">{s.name}</span>
              <button onClick={() => deleteLeadSource(s.id)} className="text-slate-400 hover:text-red-500" title="Delete">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addLeadSource} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. SEO, Google Ads, ChatGPT Ads…"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
          />
          <button type="submit" className="btn-secondary shrink-0">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Team members</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <span className="text-xs text-slate-500 capitalize bg-slate-100 rounded-full px-2 py-1">
                {u.role.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Add team member</h2>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-3">{error}</div>
        )}
        <form onSubmit={addUser} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="SALESPERSON">Salesperson</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add team member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
