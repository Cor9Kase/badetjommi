
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardPlus, CalendarPlus, Trophy, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const navItemsBase = [
  { href: "/", label: "Feed", icon: Home, requiresAuth: false },
  { href: "/logg-bad", label: "Logg Bad", icon: ClipboardPlus, requiresAuth: true },
  { href: "/planlegg-bad", label: "Planlegg", icon: CalendarPlus, requiresAuth: true },
  { href: "/planlagte-bad", label: "Kommende", icon: CalendarPlus, requiresAuth: false },
  { href: "/leaderboard", label: "Toppliste", icon: Trophy, requiresAuth: false },
];

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, loading } = useAuth();

  const getNavItems = () => {
    let items = navItemsBase;
    if (currentUser) {
      items = [...items, { href: "/profil", label: "Profil", icon: User, requiresAuth: true }];
    } else {
      items = [...items, { href: "/login", label: "Logg Inn", icon: LogIn, requiresAuth: false }];
    }
    return items.filter(item => !item.requiresAuth || (item.requiresAuth && currentUser));
  };
  
  const visibleNavItems = getNavItems();

  if (loading) {
    // Optional: render a loading state or null for the navbar while auth is loading
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-50">
        <div className="container mx-auto flex justify-around items-center h-16 max-w-md">
          {/* Placeholder for loading state, e.g., skeletons or a simple message */}
          <span className="text-xs text-muted-foreground">Laster...</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-50">
      <div className="container mx-auto flex justify-around items-center h-16 max-w-md">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/profil" && pathname.startsWith("/profil/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className={cn("h-6 w-6 mb-0.5", isActive ? "stroke-[2.5px]" : "")} />
              <span className={cn("text-xs", isActive ? "font-semibold" : "")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
