"use client";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserProgressProps {
  userId?: string; // Optional: for linking to profile
  userName: string;
  userAvatar?: string; 
  currentBaths: number;
  targetBaths: number;
  className?: string;
}

export function UserProgress({
  userId,
  userName,
  userAvatar,
  currentBaths,
  targetBaths,
  className,
}: UserProgressProps) {
  const progressPercentage = Math.min((currentBaths / targetBaths) * 100, 100);

  const UserInfo = () => (
    <div className="flex items-center space-x-3">
      {userAvatar ? (
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} alt={userName} data-ai-hint="brukeravatar"/>
          <AvatarFallback>{typeof userName === 'string' ? userName.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
            <AvatarFallback>{typeof userName === 'string' ? userName.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
        </Avatar>
      )}
      <div>
        <p className="text-sm font-medium leading-none">{userName}</p>
        <p className="text-xs text-muted-foreground">
          {currentBaths} / {targetBaths} bad
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col space-y-3 p-1", className)}>
      {userId ? (
         <Link href={`/profil/${userId}`} passHref legacyBehavior>
            <a className="hover:opacity-80 transition-opacity">
                <UserInfo />
            </a>
         </Link>
      ) : (
        <UserInfo />
      )}
      <Progress value={progressPercentage} aria-label={`${userName}s badeprogresjon`} className="h-3 [&>div]:bg-accent" />
      {currentBaths >= targetBaths && (
        <p className="text-xs text-center font-semibold text-accent">
          🎉 Mål Oppnådd! 🎉
        </p>
      )}
    </div>
  );
}

    