import { Panel } from "@/components/Panel";

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <Panel title={title}>
      <p style={{ color: "var(--charcoal-soft)", fontSize: 14, lineHeight: 1.6 }}>
        This section is planned but not built yet — it will only ship once it can show real,
        measured data (no placeholder numbers).
        {note ? ` ${note}` : ""}
      </p>
    </Panel>
  );
}
