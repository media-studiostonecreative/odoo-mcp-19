"use client";

import { useState } from "react";

/** Only follow same-site paths after sign-in, never an absolute or protocol-relative URL. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm({ next }: { next: string | null }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
      setError(body?.error ?? "Couldn't reach the planner. Check you're on the studio Wi-Fi, then try again.");
      return;
    }
    // A full load, so the server-rendered top bar picks up the new session.
    window.location.assign(safeNext(next));
  }

  return (
    <form onSubmit={submit} className="card" style={{ width: "min(400px, 100%)", padding: "32px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 22, margin: "0 0 6px" }}>
          Sign in
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Enter the access code you were given. Your name goes on everything you add or change.
        </p>
      </div>
      <div className="field">
        <label htmlFor="access-code">Access code</label>
        <input
          id="access-code"
          className="input font-mono"
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ fontSize: 16, letterSpacing: "0.08em", padding: "10px 12px" }}
        />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "var(--negative)" }}>{error}</p>}
      <button type="submit" className="btn btn-primary" style={{ height: 40 }} disabled={busy || !code.trim()}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>No code? Ask whoever manages the team to add you.</p>
    </form>
  );
}
