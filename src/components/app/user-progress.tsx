"use client";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Medal } from "lucide-react";

interface UserProgressProps {
  userId?: string; // Optional: for linking to profile
  userName: string;
  userAvatar?: string;
  currentBaths: number;
  targetBaths: number;
  className?: string;
  rank?: number;
}

export function UserProgress({
  userId,
  userName,
  userAvatar,
  currentBaths,
  targetBaths,
  className,
  rank,
}: UserProgressProps) {
  const progressPercentage = Math.min((currentBaths / targetBaths) * 100, 100);

  const rankIndicator =
    rank !== undefined ? (
      rank <= 3 ? (
        <Medal
          className={cn(
            "h-5 w-5",
            rank === 1
              ? "text-yellow-500"
              : rank === 2
              ? "text-gray-400"
              : "text-amber-700"
          )}
        />
      ) : (
        <span className="text-sm font-semibold w-5 text-center">{rank}</span>
      )
    ) : null;

  const UserInfo = () => (
    <div className="flex items-center space-x-3">
      {rankIndicator}
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
    <div
      className={cn(
        "flex flex-col space-y-3 p-1",
        rank !== undefined && rank <= 3 && "bg-accent/20 rounded-md",
        className,
      )}
    >
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
        <p className="text-xs text-center font-semibold text-accent">Mål nådd!</p>
      )}
    </div>
  );
}

    