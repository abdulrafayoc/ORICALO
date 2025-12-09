import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oricalo Platform",
  description: "AI Agent Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-black text-white`}
      >
        <Sidebar />
        <main className="pl-64 min-h-screen">
          <div className="max-w-[1600px] mx-auto p-8 lg:p-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
