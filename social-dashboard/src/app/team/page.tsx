"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { readError, relativeTime } from "@/components/planner/types";
import { Avatar } from "@/components/planner/PostDrawer";

interface TeamMember {
  id: number;
  name: string;
  role: "admin" | "member";
  created_at: string;
  revoked_at: string | null;
}

/** Shown once, straight after a code is created or reset: the server never stores it readable. */
function CodeReveal({ name, code, onDone }: { name: string; code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="card" style={{ padding: "18px 20px", borderColor: "rgba(242, 184, 75, 0.35)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <strong style={{ fontWeight: 600 }}>Access code for {name}</strong>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
          Send it to them privately. It&apos;s only shown now; if it gets lost, reset it to get a new one.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <code className="font-mono" style={{ fontSize: 20, letterSpacing: "0.1em", padding: "8px 14px", background: "var(--bg)", borderRadius: 8, userSelect: "all" }}>
          {code}
        </code>
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [people, setPeople] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ name: string; code: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/team", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return setLoadError(await readError(res, "Couldn't load the team."));
    setPeople((await res.json()).people);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role }) }).catch(() => null);
    setAdding(false);
    if (!res?.ok) return setError(await readError(res, "Couldn't add that person."));
    const body = await res.json();
    setReveal({ name: body.person.name, code: body.code });
    setName("");
    setRole("member");
    load();
  }

  async function act(person: TeamMember, action: "reset" | "revoke") {
    setError(null);
    const res = await fetch(`/api/team/${person.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    setConfirmRevoke(null);
    if (!res?.ok) return setError(await readError(res, "Couldn't update that person."));
    if (action === "reset") setReveal({ name: person.name, code: (await res.json()).code });
    load();
  }

  if (loadError) {
    return (
      <Page title="Team">
        <p className="muted">{loadError}</p>
      </Page>
    );
  }

  const active = (people ?? []).filter((p) => !p.revoked_at);
  const revoked = (people ?? []).filter((p) => p.revoked_at);

  return (
    <Page title="Team" description="Everyone who can open the planner. Each person signs in with their own code, and their name is attached to what they do.">
      {reveal && <CodeReveal name={reveal.name} code={reveal.code} onDone={() => setReveal(null)} />}

      <Panel title="Add someone">
        <form onSubmit={add} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="new-name">Name</label>
            <input id="new-name" className="input" required maxLength={80} placeholder="e.g. Jess Tran" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: "0 1 180px" }}>
            <label htmlFor="new-role">Access</label>
            <select id="new-role" className="input" value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
              <option value="member">Team member</option>
              <option value="admin">Admin (manages the team)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding || !name.trim()}>
            {adding ? "Adding…" : "Create access code"}
          </button>
        </form>
        {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--negative)" }}>{error}</p>}
      </Panel>

      <Panel title={`People · ${active.length}`}>
        {people === null ? (
          <p className="muted">Loading…</p>
        ) : (
          <div>
            {active.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                <Avatar name={p.name} size={30} />
                <div style={{ marginRight: "auto", minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {p.role === "admin" ? "Admin" : "Team member"} · added {relativeTime(p.created_at)}
                  </div>
                </div>
                {confirmRevoke === p.id ? (
                  <>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      Remove {p.name}&apos;s access?
                    </span>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => act(p, "revoke")}>
                      Remove
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmRevoke(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-sm" onClick={() => act(p, "reset")}>
                      New code
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmRevoke(p.id)}>
                      Remove access
                    </button>
                  </>
                )}
              </div>
            ))}
            {revoked.length > 0 && (
              <details className="about" style={{ marginTop: 14 }}>
                <summary>Removed · {revoked.length}</summary>
                {revoked.map((p) => (
                  <p key={p.id}>
                    {p.name}, removed {relativeTime(p.revoked_at!)}. Their comments and history stay.
                  </p>
                ))}
              </details>
            )}
          </div>
        )}
      </Panel>
    </Page>
  );
}
