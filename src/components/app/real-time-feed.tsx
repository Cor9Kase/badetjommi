
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
import type { BathEntry } from "@/types/bath";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { useNotifications } from "@/contexts/notification-context";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, increment } from "firebase/firestore";
import {
  signUpForBath,
  cancelSignUp,
  getBathSignups,
} from "@/services/bath-signup";
import type { BathSignup } from "@/types/signup";

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

export function RealTimeFeed() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const { markFeedSeen } = useNotifications();
  const [feedItems, setFeedItems] = useState<BathEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [signupsByBathId, setSignupsByBathId] = useState<Map<string, BathSignup[]>>(new Map());
  const [loadingSignups, setLoadingSignups] = useState(true);
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);

  useEffect(() => {
    setFeedLoading(true);
    setLoadingSignups(true);
    const bathsCollectionRef = collection(db, "baths");
    const q = query(bathsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const items: BathEntry[] = [];
      const signupPromises: Promise<{ bathId: string; signups: BathSignup[] }>[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as BathEntry;
        items.push({ ...data, id: docSnap.id });
        if (data.type === "planned") {
          signupPromises.push(
            getBathSignups(docSnap.id)
              .then((s) => ({ bathId: docSnap.id, signups: s }))
              .catch((err) => {
                console.error(`Error fetching signups for bath ${docSnap.id}:`, err);
                return { bathId: docSnap.id, signups: [] };
              })
          );
        }
      });
      setFeedItems(items);

      try {
        const signupResults = await Promise.all(signupPromises);
        const newMap = new Map<string, BathSignup[]>();
        signupResults.forEach((res) => newMap.set(res.bathId, res.signups));
        setSignupsByBathId(newMap);
      } catch (error) {
        console.error("Error fetching some signups: ", error);
      } finally {
        setLoadingSignups(false);
      }

      setFeedLoading(false);
    }, (error) => {
      console.error("Error fetching feed items: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste feed." });
      setFeedLoading(false);
      setLoadingSignups(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!feedLoading && !loadingSignups) {
      markFeedSeen();
    }
  }, [feedLoading, loadingSignups, markFeedSeen, feedItems]);

  const handleSignUp = async (plannedBathId: string, bathDescription: string) => {
    if (!currentUser || !currentUser.displayName) {
      toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn for å melde deg på." });
      return;
    }
    const signups = signupsByBathId.get(plannedBathId) || [];
    const alreadySignedUp = currentUser && signups.some(s => s.userId === currentUser.uid);
    if (alreadySignedUp) {
      toast({
        title: "Allerede påmeldt",
        description: "Du er allerede påmeldt",
      });
      return;
    }
    try {
      await signUpForBath(plannedBathId, currentUser.uid, currentUser.displayName!);
      // Optimistic update
      setSignupsByBathId(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(plannedBathId) || [];
        const newSignup: BathSignup = {
          id: currentUser.uid,
          userId: currentUser.uid,
          displayName: currentUser.displayName!,
          signedUpAt: Timestamp.now(),
        };
        newMap.set(plannedBathId, [...current, newSignup]);
        return newMap;
      });
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
    const signups = signupsByBathId.get(plannedBathId) || [];
    const alreadySignedUp = currentUser && signups.some(s => s.userId === currentUser.uid);
    if (!alreadySignedUp) {
      toast({
        variant: "destructive",
        title: "Ikke påmeldt",
        description: "Du er ikke registrert for dette badet.",
      });
      return;
    }

    try {
      await cancelSignUp(plannedBathId, currentUser.uid);
      setSignupsByBathId(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(plannedBathId) || [];
        newMap.set(plannedBathId, current.filter(s => s.userId !== currentUser.uid));
        return newMap;
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


  if (authLoading || feedLoading || loadingSignups) {
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
                    {entry.type === 'logged' && entry.userRankTitle && (
                      <CardDescription className="text-xs text-accent mt-1">
                        {entry.userRankTitle}
                      </CardDescription>
                    )}
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
            
            {entry.type === 'planned' && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center"><CalendarCheck className="h-5 w-5 mr-2 text-primary" /> {entry.description}</h3>
                {entry.location && <p className="text-sm text-muted-foreground">Sted: {entry.location}</p>}
                {(() => {
                  const signups = signupsByBathId.get(entry.id) || [];
                  return (
                    <>
                      <p className="text-sm text-muted-foreground">Antall påmeldte: {signups.length}</p>
                      {signups.length > 0 && (
                        <p className="text-sm text-muted-foreground">Deltakere: {signups.map(s => s.displayName).join(', ')}</p>
                      )}
                    </>
                  );
                })()}
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
                {(() => {
                  const signups = signupsByBathId.get(entry.id) || [];
                  const userSignedUp = currentUser ? signups.some(s => s.userId === currentUser.uid) : false;
                  const isOrganizer = currentUser && entry.userId === currentUser.uid;
                  return (
                    <>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{signups.length} påmeldt</span>
                      </div>
                      {isOrganizer ? (
                        <Button size="sm" variant="outline" disabled>
                          <Info className="h-4 w-4 mr-2" /> Du arrangerer
                        </Button>
                      ) : userSignedUp ? (
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
                          disabled={!currentUser}
                        >
                          <UserPlus className="h-4 w-4 mr-2" /> Meld deg på
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

