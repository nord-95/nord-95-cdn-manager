import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterWrapper } from "@/components/ui/toaster-wrapper";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FileViewProvider } from "@/contexts/FileViewContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UpdateProvider } from "@/contexts/UpdateContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { SearchBar } from "@/components/SearchBar";
import { PWAProvider } from "@/components/PWAProvider";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "CDN Manager",
  description: "Manage multiple Cloudflare R2-backed CDNs",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CDN Manager",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CDN Manager" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <UpdateProvider>
            <SearchProvider>
              <ThemeProvider>
                <AuthProvider>
                  <FileViewProvider>
                    <PWAProvider>
                      {children}
                    </PWAProvider>
                  </FileViewProvider>
                </AuthProvider>
              </ThemeProvider>
            </SearchProvider>
          </UpdateProvider>
        </LanguageProvider>
        <ToasterWrapper />
      </body>
    </html>
  );
}
