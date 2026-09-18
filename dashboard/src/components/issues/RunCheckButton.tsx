// dashboard/src/components/issues/RunCheckButton.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ScanStatus {
  id: number;
  status: "running" | "completed" | "failed";
  total_checks: number;
  completed_checks: number;
  error: string | null;
}

export function RunCheckButton({ onFinished }: { onFinished: () => void }) {
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(
    (id: number) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/checks/run/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setScan(data.scan);
        if (data.scan.status !== "running" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          onFinished();
        }
      }, 1500);
    },
    [onFinished],
  );

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/checks/run", { method: "POST" });
      if (res.ok) {
        const { scanId } = await res.json();
        poll(scanId);
      }
    } finally {
      setStarting(false);
    }
  }

  const running = scan?.status === "running";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {scan && running && (
        <span className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>
          Checking… {scan.completed_checks}/{scan.total_checks}
        </span>
      )}
      <button
        onClick={handleStart}
        disabled={starting || running}
        className="font-mono"
        style={{
          border: "1px solid var(--border-strong)",
          background: "var(--surface-alt)",
          color: "var(--text)",
          padding: "6px 12px",
          borderRadius: 8,
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          cursor: starting || running ? "default" : "pointer",
          opacity: starting || running ? 0.6 : 1,
        }}
      >
        {running ? "Checking…" : "⚡ Run Check Now"}
      </button>
    </div>
  );
}
