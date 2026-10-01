import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { OfflineBanner } from "@/components/offline-banner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema",
  description: "Painel principal do sistema",
  applicationName: "Sistema de Torneios",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Torneios",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
