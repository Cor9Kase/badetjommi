
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
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { useNotifications } from "@/contexts/notification-context";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, increment } from "firebase/firestore";
import { getBathSignups } from '@/services/bath-signup';
import type { BathSignup } from '@/types/signup';

import { CommentsDialog } from "./comments-dialog";
import { format } from "date-fns";
import { nb } from "date-fns/locale";


const ReactionButtons: FC<{ counts: { thumbsUp: number; heart: number; party: number }; onReact: (reaction: 'thumbsUp' | 'heart' | 'party') => void; disabled?: boolean }> = ({ counts, onReact, disabled }) => (
  <div className="flex gap-2">
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1 text-muted-foreground hover:text-accent"
      disabled={disabled}
      onClick={() => onReact('thumbsUp')}
    >
      <ThumbsUp className="h-4 w-4" /> {counts.thumbsUp}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1 text-muted-foreground hover:text-accent"
      disabled={disabled}
      onClick={() => onReact('heart')}
    >
      <Heart className="h-4 w-4" /> {counts.heart}
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1 text-muted-foreground hover:text-accent"
      disabled={disabled}
      onClick={() => onReact('party')}
    >
      <PartyPopper className="h-4 w-4" /> {counts.party}
    </Button>
  </div>
);

export function RealTimeFeed() {
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { markFeedSeen } = useNotifications();
  const [feedItems, setFeedItems] = useState<BathEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [signupsByBathId, setSignupsByBathId] = useState<Map<string, BathSignup[]>>(new Map());
  const [loadingSignups, setLoadingSignups] = useState(true);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);

  useEffect(() => {
    setFeedLoading(true);
    setLoadingSignups(true); // Initialize loading state for signups
    const bathsCollectionRef = collection(db, "baths");
    const q = query(bathsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const items: BathEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as BathEntry;
        items.push({ ...data, id: doc.id });
      });

      setFeedItems(items);
      setFeedLoading(false); // Feed items themselves are loaded

      // Now fetch signups for planned baths
      const plannedBathItems = items.filter(item => item.type === 'planned') as PlannedBath[];
      if (plannedBathItems.length > 0) {
        // setLoadingSignups(true); // Already true from the start of useEffect
        const signupPromises = plannedBathItems.map(bath =>
          getBathSignups(bath.id)
            .then(signups => ({ bathId: bath.id, signups }))
            .catch(err => {
              console.error(`Error fetching signups for bath ${bath.id} in feed:`, err);
              // Potentially toast here if desired, or handle silently
              return { bathId: bath.id, signups: [] }; // Return empty on error for this bath
            })
        );

        Promise.all(signupPromises)
          .then(results => {
            const newSignupsMap = new Map<string, BathSignup[]>();
            results.forEach(result => newSignupsMap.set(result.bathId, result.signups));
            setSignupsByBathId(newSignupsMap);
          })
          .catch(error => {
            console.error("Error fetching some signups for feed: ", error);
            // General error for Promise.all if any individual promise rejects unexpectedly
            // Potentially set an error state here for the UI if needed
          })
          .finally(() => {
            setLoadingSignups(false); // Finish loading signups
          });
      } else {
        setLoadingSignups(false); // No planned baths, so no signups to load
        setSignupsByBathId(new Map()); // Clear any old signup data
      }
    }, (error) => {
      console.error("Error fetching feed items: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste feed." });
      setFeedLoading(false);
      setLoadingSignups(false); // Also set loading signups to false on error
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!feedLoading && !loadingSignups) { // Add !loadingSignups
      markFeedSeen();
    }
  }, [feedLoading, loadingSignups, markFeedSeen, feedItems]); // Add loadingSignups

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


  if (authLoading || feedLoading || loadingSignups) { // Include loadingSignups
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
              <Skeleton className="w-full aspect-[4/5] rounded-md" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Adjusted condition for "No items" to wait for all loading states
  if (!authLoading && !feedLoading && !loadingSignups && feedItems.length === 0) {
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
              <div className="mb-4">
                <Image
                    src={entry.imageUrl}
                    alt={`Bad av ${entry.userName}`}
                    width={1080}
                    height={1350}
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority={index === 0}
                    className="w-full h-auto rounded-lg object-contain"
                    data-ai-hint="naturskj\u00f8nt vann"
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
            
            {entry.type === 'planned' && (() => {
              const signupsForThisBath = signupsByBathId.get(entry.id) || [];
              return (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-2 text-primary" /> {entry.description}
                  </h3>
                  {entry.location && <p className="text-sm text-muted-foreground">Sted: {entry.location}</p>}
                  <p className="text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1 inline-block" />
                    {signupsForThisBath.length} påmeldt
                  </p>
                  {signupsForThisBath.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Deltakere: {signupsForThisBath.map(s => s.displayName).join(', ')}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
          {/* Separator and CardFooter are conditional based on entry type */}
          {entry.type === 'logged' && (
            <>
              <Separator />
              <CardFooter className="p-2 flex justify-between items-center bg-secondary/30">
                <ReactionButtons
                  counts={entry.reactions}
                  onReact={(reaction) => handleReaction(entry.id, reaction)}
                  disabled={!currentUser}
                />
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
              </CardFooter>
            </>
          )}
          {/* For planned baths, the CardFooter is now removed, so no specific content here */}
        </Card>
      ))}
    </div>
  );
}

