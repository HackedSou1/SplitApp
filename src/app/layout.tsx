import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Step Up Club Hub — Toastmasters Meeting Manager",
  description:
    "RSVP for the next meeting, volunteer for roles, track role history and vote for the best speakers and role players — all in one place for your Toastmasters club.",
  keywords: ["Toastmasters", "meeting", "RSVP", "roles", "voting", "club management"],
  openGraph: {
    title: "Step Up Club Hub — Toastmasters Meeting Manager",
    description: "RSVPs, roles, history and meeting awards for your Toastmasters club.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
