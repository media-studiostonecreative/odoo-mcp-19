"use client";

import { useState } from "react";

/** Only follow same-site paths after giving a name, never an absolute or protocol-relative URL. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm({ next }: { next: string | null }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      const body = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
      setError(body?.error ?? "Couldn't reach the planner. Check you're on the studio Wi-Fi, then try again.");
      return;
    }
    // A full load, so the server-rendered top bar picks up the name.
    window.location.assign(safeNext(next));
  }

  return (
    <form onSubmit={submit} className="card" style={{ width: "min(400px, 100%)", padding: "32px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 22, margin: "0 0 6px" }}>
          What&apos;s your name?
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          It goes on the comments and changes you make. You only need to do this once; this device will remember you.
        </p>
      </div>
      <div className="field">
        <label htmlFor="your-name">Your name</label>
        <input
          id="your-name"
          className="input"
          autoFocus
          autoComplete="name"
          maxLength={60}
          placeholder="e.g. Jess"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ fontSize: 15, padding: "10px 12px" }}
        />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "var(--negative)" }}>{error}</p>}
      <button type="submit" className="btn btn-primary" style={{ height: 40 }} disabled={busy || !name.trim()}>
        {busy ? "Opening…" : "Continue"}
      </button>
    </form>
  );
}
