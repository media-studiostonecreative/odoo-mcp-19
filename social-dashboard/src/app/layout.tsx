import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/layout/TopBar";
import { currentPerson } from "@/lib/team/session";

const geist = Geist({ subsets: ["latin"], variable: "--font-body" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Social Planner — Studiostone Creative",
  description: "Content planning, team notes and social performance for Studiostone Creative",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const person = await currentPerson();
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <TopBar person={person ? { name: person.name } : null} />
        <main className="page-main">{children}</main>
      </body>
    </html>
  );
}
