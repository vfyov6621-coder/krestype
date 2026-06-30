import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "progtype",
  description:
    "progtype — статьи, заметки и встроенные веб-страницы в одном месте. Платформа для длинных публикаций в стиле Teletype.",
  keywords: [
    "progtype",
    "блог",
    "статьи",
    "публикации",
    "Teletype",
    "long-read",
  ],
  authors: [{ name: "progtype" }],
  openGraph: {
    title: "progtype",
    description: "Статьи и встроенные веб-страницы в одном месте.",
    siteName: "progtype",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "progtype",
    description: "Статьи и встроенные веб-страницы в одном месте.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <AuthProvider>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
