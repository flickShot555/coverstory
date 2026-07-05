import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileButton } from "@/components/ProfileButton";
import { HistoryNavLink } from "@/components/HistoryNavLink";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Coverstory",
  description: "Your AI-powered hyperlocal excuse generator",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Coverstory",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Coverstory — Your AI Excuse Generator",
    description:
      "Generate hyperlocal, believable excuses based on your real location and weather. Never get stuck without an out.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Coverstory — Your AI Excuse Generator",
    description:
      "Generate hyperlocal, believable excuses based on your real location and weather. Never get stuck without an out.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
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
                className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt=""
                  width={26}
                  height={26}
                  className="h-6 w-6"
                />
                Cover<span className="text-accent">story</span>
              </Link>
              <div className="flex items-center gap-2">
                <HistoryNavLink />
                <ProfileButton />
              </div>
            </nav>
          </header>
          {children}
          <ServiceWorkerRegistrar />
        </AuthProvider>
      </body>
    </html>
  );
}
