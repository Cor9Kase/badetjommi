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
import { useAuth, type UserProfile } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useNotifications } from "@/contexts/notification-context";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import type { BathEntry, PlannedBath } from "@/types/bath";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

interface AttendeeDetails {
  [uid: string]: Pick<UserProfile, "name" | "avatarUrl">;
}

export function UpcomingPlannedBaths() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const { markPlannedSeen } = useNotifications();
  const [baths, setBaths] = useState<PlannedBath[]>([]);
  const [attendeesDetails, setAttendeesDetails] = useState<AttendeeDetails>({});
  const [loadingBaths, setLoadingBaths] = useState(true);

  useEffect(() => {
    setLoadingBaths(true);
    const bathsRef = collection(db, "baths");
    const q = query(bathsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const planned: PlannedBath[] = [];
      const attendeeIdsToFetch = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BathEntry;
        if (data.type === "planned") {
          const bath = { ...(data as PlannedBath), id: docSnap.id };
          const bathDateTime = new Date(`${bath.date}T${bath.time}`);
          if (bathDateTime >= new Date()) {
            planned.push(bath);
            bath.attendees?.forEach((uid) => attendeeIdsToFetch.add(uid));
          }
        }
      });

      planned.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      setBaths(planned);

      if (attendeeIdsToFetch.size > 0) {
        const newDetails: AttendeeDetails = {};
        for (const uid of Array.from(attendeeIdsToFetch)) {
          if (!attendeesDetails[uid]) {
            const userDocRef = doc(db, "users", uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as UserProfile;
              newDetails[uid] = { name: userData.name, avatarUrl: userData.avatarUrl };
            }
          }
        }
        setAttendeesDetails((prev) => ({ ...prev, ...newDetails }));
      }
      setLoadingBaths(false);
    }, (error) => {
      console.error("Error fetching planned baths: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste planlagte bad." });
      setLoadingBaths(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!loadingBaths) {
      markPlannedSeen();
    }
  }, [loadingBaths, markPlannedSeen, baths]);

  const handleSignUp = async (bathId: string, description: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn for å melde deg på." });
      return;
    }
    const bathRef = doc(db, "baths", bathId);
    try {
      await updateDoc(bathRef, {
        attendees: arrayUnion(currentUser.uid)
      });
      toast({ title: "Påmeldt!", description: `Du er nå påmeldt \"${description}\".` });
    } catch (error) {
      console.error("Error signing up: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg på." });
    }
  };

  const handleSignOff = async (bathId: string, description: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn." });
      return;
    }
    const bathRef = doc(db, "baths", bathId);
    try {
      await updateDoc(bathRef, {
        attendees: arrayRemove(currentUser.uid)
      });
      toast({ title: "Avmeldt!", description: `Du er nå avmeldt \"${description}\".` });
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

  if (authLoading || loadingBaths) {
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

  if (baths.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-lg">Ingen kommende bad planlagt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {baths.map((bath) => (
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
            <p className="text-sm text-muted-foreground">Antall påmeldte: {bath.attendees ? bath.attendees.length : 0}</p>
            {bath.attendees && bath.attendees.length > 0 && (
              <p className="text-sm text-muted-foreground">Deltakere: {bath.attendees.map(uid => attendeesDetails[uid]?.name || 'Laster...').join(', ')}</p>
            )}
          </CardContent>
          <Separator />
          <CardFooter className="p-2 flex justify-between items-center bg-secondary/30">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-2" />
              <span>{bath.attendees ? bath.attendees.length : 0} påmeldt</span>
            </div>
            {currentUser && bath.userId === currentUser.uid ? (
              <Button size="sm" variant="outline" disabled>
                <Info className="h-4 w-4 mr-2" /> Du arrangerer
              </Button>
            ) : currentUser && bath.attendees && bath.attendees.includes(currentUser.uid) ? (
              <Button size="sm" variant="outline" onClick={() => handleSignOff(bath.id, bath.description)}>
                <UserMinus className="h-4 w-4 mr-2" /> Meld deg av
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleSignUp(bath.id, bath.description)} disabled={!currentUser}>
                <UserPlus className="h-4 w-4 mr-2" /> Meld deg på
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

