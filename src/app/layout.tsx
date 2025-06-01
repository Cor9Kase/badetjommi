
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Image from 'next/image';
import { ClientLayoutWrapper } from '@/components/layout/client-layout-wrapper';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider
import { NotificationProvider } from '@/contexts/notification-context';

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen text-base md:text-lg`}>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <NotificationProvider>
          <header className="bg-primary text-primary-foreground py-4 px-4 md:px-8 shadow-md sticky top-0 z-40">
            <div className="container mx-auto flex items-center justify-center">
              <div className="flex items-center gap-2 md:gap-3">
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/badekompis.firebasestorage.app/o/faf3f0e2ed9a26a67add530be61213ad0e2cf742ee9a43eccb9495fb66ae2295.png?alt=media"
                  alt="Badekompis logo"
                  width={40}
                  height={40}
                  className="h-8 w-8 md:h-10 md:w-10"
                />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Badekompis</h1>
              </div>
            </div>
          </header>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
          <Toaster />
          </NotificationProvider>
        </AuthProvider> {/* Close AuthProvider */}
      </body>
    </html>
  );
}

