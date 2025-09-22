import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterWrapper } from "@/components/ui/toaster-wrapper";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FileViewProvider } from "@/contexts/FileViewContext";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "CDN Manager",
  description: "Manage multiple Cloudflare R2-backed CDNs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <FileViewProvider>
              {children}
            </FileViewProvider>
          </AuthProvider>
        </ThemeProvider>
        <ToasterWrapper />
      </body>
    </html>
  );
}
