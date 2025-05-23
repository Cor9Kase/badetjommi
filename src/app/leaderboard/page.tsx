
"use client";

import { UserProgress } from "@/components/app/user-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const usersCollectionRef = collection(db, "users");
    // Order by currentBaths in descending order, then by name for tie-breaking
    const q = query(usersCollectionRef, orderBy("currentBaths", "desc"), orderBy("name", "asc"), limit(20)); 

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      setLeaderboardData(users);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard data: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste topplisten."});
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Waves className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Laster toppliste...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Trophy className="mr-3 h-8 w-8 text-yellow-500" />
            Toppliste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaderboardData.length > 0 ? (
            leaderboardData.map((user, index) => (
            <UserProgress 
              key={user.uid || index} 
              userId={user.uid}
              userName={user.name} 
              currentBaths={user.currentBaths} 
              targetBaths={user.targetBaths}
              userAvatar={user.avatarUrl} 
              className="py-3 px-2 border-b last:border-b-0"
            />
          ))
          ) : (
            <p className="text-muted-foreground text-center py-4">Ingen badere på topplisten ennå. Bli den første!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

