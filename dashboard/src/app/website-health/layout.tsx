import { HealthSidebar } from "@/components/health/HealthSidebar";

export default function WebsiteHealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 32px 64px", display: "flex", gap: 28 }}>
      <HealthSidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}
