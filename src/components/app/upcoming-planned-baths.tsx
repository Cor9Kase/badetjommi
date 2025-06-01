"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CalendarCheck, Users, UserMinus, UserPlus, Info, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useNotifications } from "@/contexts/notification-context";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { signUpForBath, cancelSignUp, getBathSignups } from "@/services/bath-signup";
import type { BathEntry, PlannedBath } from "@/types/bath";
import type { BathSignup } from "@/types/signup"; // Updated import
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export function UpcomingPlannedBaths() {
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { markPlannedSeen } = useNotifications();
  const [baths, setBaths] = useState<PlannedBath[]>([]);
  const [loadingBaths, setLoadingBaths] = useState(true);
  const [signupsByBathId, setSignupsByBathId] = useState<Map<string, BathSignup[]>>(new Map());
  const [loadingSignups, setLoadingSignups] = useState(true);

  useEffect(() => {
    setLoadingBaths(true);
    setLoadingSignups(true);
    const bathsRef = collection(db, "baths");
    const q = query(bathsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const planned: PlannedBath[] = [];
      const signupPromises: Promise<{ bathId: string; signups: BathSignup[] }>[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BathEntry;
        if (data.type === "planned") {
          const bath = { ...(data as PlannedBath), id: docSnap.id };
          const bathDateTime = new Date(`${bath.date}T${bath.time}`);
          if (bathDateTime >= new Date()) {
            planned.push(bath);
            signupPromises.push(
              getBathSignups(bath.id).then(s => ({ bathId: bath.id, signups: s })).catch(err => {
                console.error(`Error fetching signups for bath ${bath.id}:`, err);
                toast({ variant: "destructive", title: "Feil", description: `Kunne ikke laste påmeldinger for ${bath.description}.` });
                return { bathId: bath.id, signups: [] }; // Return empty on error for this bath
              })
            );
          }
        }
      });

      planned.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
      setBaths(planned);
      setLoadingBaths(false);

      try {
        const signupResults = await Promise.all(signupPromises);
        const newSignupsMap = new Map<string, BathSignup[]>();
        signupResults.forEach(result => newSignupsMap.set(result.bathId, result.signups));
        setSignupsByBathId(newSignupsMap);
      } catch (error) {
        console.error("Error fetching some signups: ", error);
        // Toast for general signup fetch error already handled in individual promises
      } finally {
        setLoadingSignups(false);
      }

    }, (error) => {
      console.error("Error fetching planned baths: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste planlagte bad." });
      setLoadingBaths(false);
      setLoadingSignups(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!loadingBaths && !loadingSignups) {
      markPlannedSeen();
    }
  }, [loadingBaths, loadingSignups, markPlannedSeen, baths]);

  const handleSignUp = async (bathId: string, description: string) => {
    if (!currentUser || !currentUser.uid || !userProfile) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn for å melde deg på." });
      return;
    }
    try {
      await signUpForBath(bathId, currentUser.uid, userProfile.name);
      toast({ title: "Påmeldt!", description: `Du er nå påmeldt \"${description}\".` });
      // Optimistic update
      setSignupsByBathId(prevMap => {
        const newMap = new Map(prevMap);
        const currentSignups = newMap.get(bathId) || [];
        // Create a mock BathSignup object - signedUpAt will be a server value,
        // but for optimistic update this is okay. It will be correct on next fetch.
        const newSignup: BathSignup = {
          id: currentUser.uid, // doc id is the user's uid
          userId: currentUser.uid,
          displayName: userProfile.name,
          signedUpAt: Timestamp.now(), // Temporary, will be replaced by server value
        };
        newMap.set(bathId, [...currentSignups, newSignup]);
        return newMap;
      });
    } catch (error) {
      console.error("Error signing up: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg på." });
    }
  };

  const handleSignOff = async (bathId: string, description: string) => {
    if (!currentUser || !currentUser.uid) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn." });
      return;
    }
    try {
      await cancelSignUp(bathId, currentUser.uid);
      toast({ title: "Avmeldt!", description: `Du er nå avmeldt \"${description}\".` });
      // Optimistic update
      setSignupsByBathId(prevMap => {
        const newMap = new Map(prevMap);
        const currentSignups = newMap.get(bathId) || [];
        newMap.set(bathId, currentSignups.filter(s => s.userId !== currentUser.uid));
        return newMap;
      });
    } catch (error) {
      console.error("Error signing off: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg av." });
    }
  };

  const formatDateForDisplay = (dateInput: string | Timestamp) => {
    try {
      const date = dateInput instanceof Timestamp ? dateInput.toDate() : new Date(dateInput);
      return format(date, "d. MMMM yyyy", { locale: nb });
    } catch (e) {
      return String(dateInput);
    }
  };

  if (authLoading || loadingBaths || loadingSignups) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="overflow-hidden shadow-md bg-card">
            <CardHeader className="p-4 sm:p-6 flex items-center space-x-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!loadingBaths && !loadingSignups && baths.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-lg">Ingen kommende bad planlagt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {baths.map((bath) => {
        const signupsForThisBath = signupsByBathId.get(bath.id) || [];
        const isCurrentUserSignedUp = currentUser ? signupsForThisBath.some(s => s.userId === currentUser.uid) : false;
        const isOrganizer = currentUser && bath.userId === currentUser.uid;

        return (
          <Card key={bath.id} className="overflow-hidden shadow-md bg-card">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <Link href={`/profil/${bath.userId}`} className="flex items-center space-x-3 group">
                  <Avatar className="h-11 w-11 border-2 border-primary/50">
                    <AvatarImage src={bath.userAvatar || `https://picsum.photos/seed/${bath.userId}/40/40`} alt={bath.userName} />
                    <AvatarFallback>{typeof bath.userName === 'string' ? bath.userName.substring(0,2).toUpperCase() : '??'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg font-semibold group-hover:underline">{bath.userName}</CardTitle>
                  </div>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 space-y-2">
              <h3 className="font-semibold text-lg flex items-center"><CalendarCheck className="h-5 w-5 mr-2 text-primary" /> {bath.description}</h3>
              {bath.location && <p className="text-sm text-muted-foreground">Sted: {bath.location}</p>}
              <p className="text-sm text-muted-foreground">{formatDateForDisplay(bath.date)} kl. {bath.time}</p>
              <p className="text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1 inline-block" />
                {signupsForThisBath.length} påmeldt
              </p>
              {signupsForThisBath.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Deltakere: {signupsForThisBath.map(s => s.displayName).join(', ')}
                </div>
              )}
            </CardContent>
            <Separator />
            <CardFooter className="p-2 flex justify-between items-center bg-secondary/30">
               <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>{signupsForThisBath.length} påmeldt</span>
              </div>
              {isOrganizer ? (
                <Button size="sm" variant="outline" disabled>
                  <Info className="h-4 w-4 mr-2" /> Du arrangerer
                </Button>
              ) : isCurrentUserSignedUp ? (
                <Button size="sm" variant="outline" onClick={() => handleSignOff(bath.id, bath.description)} disabled={!currentUser}>
                  <UserMinus className="h-4 w-4 mr-2" /> Meld deg av
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleSignUp(bath.id, bath.description)} disabled={!currentUser}>
                  <UserPlus className="h-4 w-4 mr-2" /> Meld deg på
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

