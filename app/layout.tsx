import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterWrapper } from "@/components/ui/toaster-wrapper";

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
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ToasterWrapper />
      </body>
    </html>
  );
}
