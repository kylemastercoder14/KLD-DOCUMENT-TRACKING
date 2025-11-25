import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactQueryProvider } from '@/components/react-query-provider';
import { Toaster } from '@/components/ui/sonner';
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
  title: "KLD Document Monitoring and Tracking System",
  description: "The centralized document monitoring and tracking system designed for the modern campus. Efficient, transparent, and secure.",
  icons: {
    icon: "/kld-logo.webp"
  }
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
        <ReactQueryProvider>
          {children}
          <Toaster richColors position='top-right' />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
