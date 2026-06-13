"use client";

import { useState, useMemo } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt: string | Date | null;
  _count: { entries: number };
};

function formatLastLogin(value: string | Date | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type SortCol = "name" | "email" | "entries" | "lastLogin" | "role";

function SortHeader({
  col, label, sort, onSort, align = "left",
}: {
  col: SortCol; label: string; sort: { col: SortCol; dir: "asc" | "desc" };
  onSort: (col: SortCol) => void; align?: "left" | "center";
}) {
  const active = sort.col === col;
  return (
    <th className={`px-4 py-3 text-${align}`}>
      <button
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide text-xs font-semibold transition ${
          active ? "text-green-700" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        {label}
        <span className="text-[10px]">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </button>
    </th>
  );
}

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const sortedUsers = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      switch (sort.col) {
        case "name":
          return dir * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "email":
          return dir * a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
        case "entries":
          return dir * (a._count.entries - b._count.entries);
        case "lastLogin": {
          const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : -Infinity;
          const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : -Infinity;
          return dir * (ta - tb);
        }
        case "role":
          return dir * a.role.localeCompare(b.role);
      }
    });
  }, [users, sort]);

  function toggleSort(col: SortCol) {
    setSort((prev) => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  }

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  async function createUser() {
    setCreating(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${createForm.firstName.trim()} ${createForm.lastName.trim()}`,
        email: createForm.email,
        password: createForm.password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create user.");
    } else {
      const listRes = await fetch("/api/admin/users");
      if (listRes.ok) {
        const newUsers = await listRes.json();
        setUsers(newUsers);
      } else {
        setUsers((prev) => [...prev, {
          id: data.id ?? Math.random().toString(),
          name: `${createForm.firstName.trim()} ${createForm.lastName.trim()}`,
          email: createForm.email,
          role: "USER",
          lastLoginAt: null,
          _count: { entries: 0 },
        }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setMessage(`Account created for ${createForm.firstName.trim()} ${createForm.lastName.trim()}.`);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "" });
      setShowCreate(false);
    }
    setCreating(false);
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    setLoadingId(user.id);
    setMessage("");
    setError("");

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update role.");
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setMessage(`${user.name} is now ${newRole === "ADMIN" ? "an Admin" : "a User"}.`);
    }
    setLoadingId(null);
  }

  async function deleteUser(user: User) {
    if (!confirm(`Delete ${user.name}? This will also remove all their entries and picks.`)) return;
    setLoadingId(user.id);
    setMessage("");
    setError("");

    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to delete user.");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setMessage(`${user.name} has been deleted.`);
    }
    setLoadingId(null);
  }

  return (
    <div>
      {message && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">{error}</p>}

      {/* Create User */}
      <div className="mb-6">
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            + Create User
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Create New User</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                <input
                  type="text"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                <input
                  type="text"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showCreatePassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createUser}
                disabled={creating || !createForm.firstName || !createForm.lastName || !createForm.email || !createForm.password}
                className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Account"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateForm({ firstName: "", lastName: "", email: "", password: "" }); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: accordion cards */}
      <div className="sm:hidden flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sortedUsers.map((user, i) => {
          const isOpen = expandedUserId === user.id;
          return (
            <div key={user.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpandedUserId(isOpen ? null : user.id)}
              >
                <div>
                  <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "ADMIN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>{user.role}</span>
                  <span className={`text-gray-400 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2 pt-3 text-xs text-gray-500">
                    <div><span className="font-semibold">Entries:</span> {user._count.entries}</div>
                    <div><span className="font-semibold">Last Login:</span><br />{formatLastLogin(user.lastLoginAt)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={loadingId === user.id}
                      className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {user.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={loadingId === user.id}
                      className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: full table */}
      <div className="hidden sm:block rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <SortHeader col="name"      label="Name"       sort={sort} onSort={toggleSort} />
              <SortHeader col="email"     label="Email"      sort={sort} onSort={toggleSort} />
              <SortHeader col="entries"   label="Entries"    sort={sort} onSort={toggleSort} align="center" />
              <SortHeader col="lastLogin" label="Last Login" sort={sort} onSort={toggleSort} align="center" />
              <SortHeader col="role"      label="Role"       sort={sort} onSort={toggleSort} align="center" />
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedUsers.map((user, i) => (
              <tr key={user.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="text-center px-4 py-3 text-gray-600">{user._count.entries}</td>
                <td className="text-center px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatLastLogin(user.lastLoginAt)}</td>
                <td className="text-center px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "ADMIN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={loadingId === user.id}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {user.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={loadingId === user.id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
