import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FABController from "@/components/ui/FABController"
import SyncProvider from "@/components/providers/sync-provider"
import ServiceWorkerRegister from "@/components/providers/sw-register"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gruper",
  description: "A simple group expense manager built with Next.js 13 and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        <SyncProvider />
        {children}
        <FABController />
      </body>
    </html>
  );
}
