
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Waves } from 'lucide-react';
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Badekompis',
  description: 'Logg dine bad, følg progresjon, og planlegg gruppedykk!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <header className="bg-primary text-primary-foreground py-4 px-4 md:px-8 shadow-md sticky top-0 z-40">
            <div className="container mx-auto flex items-center justify-center">
              <div className="flex items-center gap-2 md:gap-3">
                <Waves className="h-8 w-8 md:h-10 md:w-10" />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Badekompis</h1>
              </div>
            </div>
          </header>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
          <Toaster />
        </AuthProvider> {/* Close AuthProvider */}
      </body>
    </html>
  );
}

