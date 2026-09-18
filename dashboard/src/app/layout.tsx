import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"], style: ["normal", "italic"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Website Health — Studiostone Creative",
  description: "Website health, audit, and customer journey monitoring for Studiostone Creative",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`} style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 36px 96px", width: "100%" }}>{children}</div>
      </body>
    </html>
  );
}
