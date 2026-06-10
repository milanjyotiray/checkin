import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Quantico } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const quantico = Quantico({
  weight: ["700"],
  variable: "--font-quantico",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRASHLAB | Check-In Terminal",
  description: "Official Self Check-In Portal for Paradox'26, IIT Madras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${quantico.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-slate-200">
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
        
        {/* Global UI Overlays */}
        <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] mix-blend-overlay">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        </div>
        <div className="fixed inset-0 pointer-events-none z-[9999] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)]" />
      </body>
    </html>
  );
}
