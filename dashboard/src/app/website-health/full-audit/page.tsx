import { Panel } from "@/components/Panel";
import Link from "next/link";

export default function Page() {
  return (
    <Panel title="Full Audit">
      <p style={{ color: "var(--charcoal-soft)", fontSize: 14, lineHeight: 1.6 }}>
        The existing monthly Claude-CLI-driven audit (<code>run-monthly-audit.sh</code>) keeps running
        on its own schedule via launchd — the 1st of each month at 9:00am — and now correctly emails
        the finished report. A &quot;Run Full Audit&quot; trigger button from this dashboard, plus
        frontend-design-audit evaluation wired into the same run, are planned for a follow-up pass.
      </p>
      <p style={{ fontSize: 14 }}>
        In the meantime, every completed run shows up automatically in{" "}
        <Link href="/website-health/audit-history" style={{ color: "var(--beige-accent)" }}>
          Audit History
        </Link>
        .
      </p>
    </Panel>
  );
}
