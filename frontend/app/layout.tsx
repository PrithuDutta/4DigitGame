import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4-DIGIT REACTION | Cyber Arcade Math",
  description: "Fast-paced competitive 4-digit math reaction game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[var(--bg-dark)] text-[var(--text-main)] font-[var(--font-ui)] selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
