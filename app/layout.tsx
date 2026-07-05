import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileButton } from "@/components/ProfileButton";
import { HistoryNavLink } from "@/components/HistoryNavLink";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Coverstory",
  description: "AI-powered excuse generator",
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
        <AuthProvider>
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
            <nav className="mx-auto flex max-w-[520px] items-center justify-between px-5 py-3">
              <Link
                href="/"
                className="text-lg font-extrabold tracking-tight"
              >
                Cover<span className="text-accent">story</span>
              </Link>
              <div className="flex items-center gap-2">
                <HistoryNavLink />
                <ProfileButton />
              </div>
            </nav>
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
