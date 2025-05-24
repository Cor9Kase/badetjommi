
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ThumbsUp, Heart, PartyPopper, Droplets, CalendarCheck, Users, UserCheck, UserPlus, Info, UserMinus, Smile, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import type { FC } from "react";
import { useState, useEffect } from "react";
import type { BathEntry, PlannedBath } from "@/types/bath"; 
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserProfile } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp, increment } from "firebase/firestore";

import { CommentsDialog } from "./comments-dialog";
import { format } from "date-fns";
import { nb } from "date-fns/locale";


const ReactionButton: FC<{ icon: React.ElementType, count: number, label: string, onClick?: () => void, disabled?: boolean }> = ({ icon: Icon, count, label, onClick, disabled }) => (
  <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground hover:text-accent" onClick={onClick} disabled={disabled}>
    <Icon className="h-4 w-4" />
    <span>{count}</span>
    <span className="sr-only">{label}</span>
  </Button>
);

interface AttendeeDetails {
  [uid: string]: Pick<UserProfile, 'name' | 'avatarUrl'>;
}

export function RealTimeFeed() {
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [feedItems, setFeedItems] = useState<BathEntry[]>([]);
  const [attendeesDetails, setAttendeesDetails] = useState<AttendeeDetails>({});
  const [feedLoading, setFeedLoading] = useState(true);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);

  useEffect(() => {
    setFeedLoading(true);
    const bathsCollectionRef = collection(db, "baths");
    const q = query(bathsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const items: BathEntry[] = [];
      const attendeeIdsToFetch = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data() as BathEntry;
        items.push({ ...data, id: doc.id });
        if (data.type === 'planned') {
            data.attendees?.forEach(uid => attendeeIdsToFetch.add(uid));
        }
      });

      setFeedItems(items);
      
      // Fetch details for attendees if there are any new ones
      if (attendeeIdsToFetch.size > 0) {
        const newAttendeesDetails: AttendeeDetails = {};
        for (const uid of Array.from(attendeeIdsToFetch)) {
            if (!attendeesDetails[uid]) { // Only fetch if not already fetched
                const userDocRef = doc(db, "users", uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data() as UserProfile;
                    newAttendeesDetails[uid] = { name: userData.name, avatarUrl: userData.avatarUrl };
                }
            }
        }
        setAttendeesDetails(prev => ({ ...prev, ...newAttendeesDetails }));
      }
      setFeedLoading(false);
    }, (error) => {
      console.error("Error fetching feed items: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste feed." });
      setFeedLoading(false);
    });

    return () => unsubscribe();
  }, [toast]); // Removed attendeesDetails from dependency array to prevent potential infinite loop

  const handleSignUp = async (plannedBathId: string, bathDescription: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn for å melde deg på." });
      return;
    }
    const bathDocRef = doc(db, "baths", plannedBathId);
    try {
      await updateDoc(bathDocRef, {
        attendees: arrayUnion(currentUser.uid)
      });
      // Optimistically update local state (attendeesDetails will eventually catch up via snapshot)
      // No need to directly setAttendeesDetails here as the onSnapshot listener will handle it
      toast({
        title: "Påmeldt!",
        description: `Du er nå påmeldt "${bathDescription}".`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error signing up for bath: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg på." });
    }
  };

  const handleSignOff = async (plannedBathId: string, bathDescription: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn." });
      return;
    }
    const bathDocRef = doc(db, "baths", plannedBathId);
    try {
      await updateDoc(bathDocRef, {
        attendees: arrayRemove(currentUser.uid)
      });
      toast({
        title: "Avmeldt!",
        description: `Du er nå avmeldt "${bathDescription}".`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error signing off from bath: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg av." });
    }
  };

  const handleReaction = async (
    bathId: string,
    reaction: 'thumbsUp' | 'heart' | 'party'
  ) => {
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Logg Inn',
        description: 'Du må være logget inn for å reagere.'
      });
      return;
    }
    try {
      const bathDocRef = doc(db, 'baths', bathId);
      await updateDoc(bathDocRef, { [`reactions.${reaction}`]: increment(1) });
    } catch (error) {
      console.error('Error updating reaction: ', error);
      toast({ variant: 'destructive', title: 'Feil', description: 'Kunne ikke lagre reaksjonen.' });
    }
  };


  if (authLoading || feedLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden shadow-md bg-card">
            <CardHeader className="p-4 sm:p-6 flex items-center space-x-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 space-y-2">
              <Skeleton className="aspect-video w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Droplets className="mx-auto h-12 w-12 mb-4 text-primary" />
        <p className="text-lg">Ingen plask eller planer logget ennå.</p>
        <p>Bli den første til å dykke i og logge badet ditt eller planlegg et fellesbad!</p>
      </div>
    );
  }
  
  const formatDateForDisplay = (dateInput: string | Timestamp) => {
    try {
      const date =
        dateInput instanceof Timestamp
          ? dateInput.toDate()
          : new Date(dateInput);
      return format(date, "d. MMMM yyyy", { locale: nb });
    } catch (e) {
      return String(dateInput); // Fallback if parsing fails
    }
  };

  return (
    <div className="space-y-6">
      {feedItems.map((entry, index) => (
        <Card key={entry.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Link href={`/profil/${entry.userId}`} passHref legacyBehavior>
                <a className="flex items-center space-x-3 group">
                  <Avatar className="h-11 w-11 border-2 border-primary/50">
                    <AvatarImage src={entry.userAvatar || `https://picsum.photos/seed/${entry.userId}/40/40`} alt={entry.userName} data-ai-hint="brukeravatar"/>
                    <AvatarFallback>{typeof entry.userName === 'string' ? entry.userName.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg font-semibold group-hover:underline">{entry.userName}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {entry.type === 'planned' ? 'Planla et bad for ' : ''}
                      {formatDateForDisplay(entry.date)} kl. {entry.time}
                      {entry.location && ` @ ${entry.location}`}
                    </CardDescription>
                  </div>
                </a>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6">
            {entry.type === 'logged' && entry.imageUrl && (
              <div className="mb-4 rounded-lg overflow-hidden aspect-video relative">
                <Image
                    src={entry.imageUrl}
                    alt={`Bad av ${entry.userName}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority={index === 0}
                    className="object-cover"
                    data-ai-hint="naturskjønt vann"
                />
              </div>
            )}
             {entry.type === 'logged' && (
              <div className="space-y-1 mb-3">
                {entry.comments && <p className="text-sm">{entry.comments}</p>}
                {entry.waterTemperature && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Smile className="h-4 w-4 mr-1.5 text-primary" />
                    <span>Temperaturfølelse: {entry.waterTemperature}</span>
                  </div>
                )}
              </div>
            )}
            
            {entry.type === 'planned' && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center"><CalendarCheck className="h-5 w-5 mr-2 text-primary" /> {entry.description}</h3>
                {entry.location && <p className="text-sm text-muted-foreground">Sted: {entry.location}</p>}
                <p className="text-sm text-muted-foreground">Antall påmeldte: {entry.attendees ? entry.attendees.length : 0}</p>
                {entry.attendees && entry.attendees.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Deltakere: {entry.attendees.map(uid => attendeesDetails[uid]?.name || 'Laster...').join(', ')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <Separator />
          <CardFooter className="p-2 flex justify-between items-center bg-secondary/30">
            {entry.type === 'logged' ? (
              <>
                <div className="flex items-center space-x-1">
                  <ReactionButton
                    icon={ThumbsUp}
                    count={entry.reactions.thumbsUp}
                    label="Tommel Opp"
                    onClick={() => handleReaction(entry.id, 'thumbsUp')}
                    disabled={!currentUser}
                  />
                  <ReactionButton
                    icon={Heart}
                    count={entry.reactions.heart}
                    label="Hjerte"
                    onClick={() => handleReaction(entry.id, 'heart')}
                    disabled={!currentUser}
                  />
                  <ReactionButton
                    icon={PartyPopper}
                    count={entry.reactions.party}
                    label="Fest"
                    onClick={() => handleReaction(entry.id, 'party')}
                    disabled={!currentUser}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-accent"
                  onClick={() => setOpenCommentsId(entry.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {entry.commentCount} Kommentarer
                </Button>
                <CommentsDialog
                  bathId={entry.id}
                  open={openCommentsId === entry.id}
                  onOpenChange={(open) => !open && setOpenCommentsId(null)}
                />
              </>
            ) : ( // Planned bath
              <div className="flex w-full justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{entry.attendees ? entry.attendees.length : 0} påmeldt</span>
                </div>
                {currentUser && entry.userId === currentUser.uid ? (
                   <Button size="sm" variant="outline" disabled>
                     <Info className="h-4 w-4 mr-2" /> Du arrangerer
                   </Button>
                ) : currentUser && entry.attendees && entry.attendees.includes(currentUser.uid) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSignOff(entry.id, entry.description)}
                  >
                    <UserMinus className="h-4 w-4 mr-2" /> Meld deg av
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => handleSignUp(entry.id, entry.description)}
                    disabled={!currentUser} // Disable if no user logged in
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Meld deg på
                  </Button>
                )}
              </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

