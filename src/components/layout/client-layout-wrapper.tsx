
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';

export function ClientLayoutWrapper({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // This will only run on the client, after initial hydration
    setCurrentYear(new Date().getFullYear());
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <>
      <main className="flex-grow container mx-auto p-4 md:p-6 pb-24"> {/* pb-24 for Navbar space */}
        {children}
      </main>
      <Navbar />
      <footer className="bg-secondary text-secondary-foreground py-3 px-4 md:px-8 text-center text-xs md:text-sm">
        <p>&copy; {currentYear ?? '...'} Badekompis. Hopp i havet!</p>
      </footer>
    </>
  );
}

