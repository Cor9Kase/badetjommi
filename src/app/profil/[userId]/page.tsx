
"use client"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, CalendarDays, MapPinIcon, MessageSquare, CalendarCheck, Users, UserPlus, Info, UserMinus, Smile, Waves } from "lucide-react";
import Image from "next/image";
import { UserProgress } from "@/components/app/user-progress";
import type { BathEntry, PlannedBath, WaterTemperatureFeeling } from "@/types/bath"; 
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { format as formatDateFns } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";


export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { toast } = useToast();
  const { currentUser: loggedInUser, userProfile: loggedInUserProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [bathLog, setBathLog] = useState<BathEntry[]>([]);
  const [attendeesDetails, setAttendeesDetails] = useState<Record<string, Pick<UserProfile, 'name' | 'avatarUrl'>>>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setProfileLoading(true);
      const fetchProfileData = async () => {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUser(userDocSnap.data() as UserProfile);
        } else {
          toast({ variant: "destructive", title: "Bruker Ikke Funnet", description: "Kunne ikke finne profilen." });
          setUser(null);
        }
        setProfileLoading(false);
      };
      fetchProfileData();
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) {
      setLogLoading(true);
      const bathsCollectionRef = collection(db, "baths");
      const q = query(bathsCollectionRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const logEntries: BathEntry[] = [];
        const attendeeIdsToFetch = new Set<string>();

        snapshot.forEach(doc => {
          const data = doc.data() as BathEntry;
          logEntries.push({ ...data, id: doc.id });
           if (data.type === 'planned') {
            data.attendees?.forEach(uid => attendeeIdsToFetch.add(uid));
          }
        });
        setBathLog(logEntries);

        // Fetch details for attendees
        if (attendeeIdsToFetch.size > 0) {
            const newAttendeesDetails: Record<string, Pick<UserProfile, 'name' | 'avatarUrl'>> = {};
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
        setLogLoading(false);
      }, (error) => {
        console.error("Error fetching bath log:", error);
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste aktivitetslogg."});
        setLogLoading(false);
      });
      return () => unsubscribe();
    }
  }, [userId, toast]);


  const handleSignUpForPlannedBath = async (bathId: string, bathDescription: string) => {
    if (!loggedInUser) {
        toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn for å melde deg på." });
        return;
    }
    const bathDocRef = doc(db, "baths", bathId);
    try {
        await updateDoc(bathDocRef, {
            attendees: arrayUnion(loggedInUser.uid)
        });
        // Optimistically update local state for attendees if needed, or rely on snapshot listener
        setAttendeesDetails(prev => ({
            ...prev,
            [loggedInUser.uid]: { name: loggedInUserProfile?.name || "Deg", avatarUrl: loggedInUserProfile?.avatarUrl }
        }));
        toast({
            title: "Påmeldt!",
            description: `Du er nå påmeldt "${bathDescription}".`,
        });
    } catch (error) {
        console.error("Error signing up for bath: ", error);
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg på." });
    }
  };

  const handleSignOffFromPlannedBath = async (bathId: string, bathDescription: string) => {
     if (!loggedInUser) {
        toast({ variant: "destructive", title: "Logg Inn", description: "Du må være logget inn." });
        return;
    }
    const bathDocRef = doc(db, "baths", bathId);
     try {
        await updateDoc(bathDocRef, {
            attendees: arrayRemove(loggedInUser.uid)
        });
        toast({
            title: "Avmeldt!",
            description: `Du er nå avmeldt "${bathDescription}".`,
        });
    } catch (error) {
        console.error("Error signing off from bath: ", error);
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke melde deg av." });
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      return formatDateFns(new Date(dateString), "d. MMMM yyyy", { locale: nb });
    } catch (e) {
      return dateString; 
    }
  };


  if (profileLoading || authLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Waves className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Laster profil...</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Bruker ikke funnet</h1>
        <p className="text-muted-foreground">Denne profilen eksisterer ikke eller kunne ikke lastes.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Tilbake til Feed</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.name} data-ai-hint="brukerprofil avatar" />
              <AvatarFallback>{typeof user.name === 'string' ? user.name.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-bold">{user.name}</CardTitle>
            {user.bio && <CardDescription className="mt-1 text-md">{user.bio}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent>
            <UserProgress
                userName={user.name}
                userAvatar={user.avatarUrl}
                currentBaths={user.currentBaths}
                targetBaths={user.targetBaths}
            />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <Droplets className="mr-3 h-7 w-7 text-primary" />
            Aktivitetslogg
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logLoading ? (
             <div className="flex justify-center items-center p-8"><Waves className="h-8 w-8 animate-spin" /> Laster logg...</div>
          ) : bathLog && bathLog.length > 0 ? (
            <div className="space-y-4">
              {bathLog.map((bath: BathEntry) => (
                <Card key={bath.id} className="overflow-hidden bg-card">
                  <CardHeader className="p-4 bg-secondary/20">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {bath.type === 'planned' ? <CalendarCheck className="h-4 w-4 text-accent" /> : <CalendarDays className="h-4 w-4" />}
                      <span>{formatDateForDisplay(bath.date)} kl. {bath.time}</span>
                    </div>
                    {bath.location && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{bath.location}</span>
                      </div>
                    )}
                     {bath.type === 'planned' && <p className="text-sm font-medium text-accent mt-1">{bath.description}</p>}
                  </CardHeader>
                  <CardContent className="p-4">
                    {bath.type === 'logged' && bath.imageUrl && (
                      <div className="mb-3 rounded-md overflow-hidden aspect-video relative w-full max-w-xs mx-auto">
                        <Image
                          src={bath.imageUrl}
                          alt={`Bad fra ${bath.date}`}
                          fill
                          className="object-cover"
                          data-ai-hint="bilde badelogg"
                        />
                      </div>
                    )}
                    {bath.type === 'logged' && (
                        <div className="space-y-1 text-sm">
                            {bath.comments && (
                                <div className="flex items-start space-x-2">
                                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                                    <p>{bath.comments}</p>
                                </div>
                            )}
                            {bath.waterTemperature && (
                                <div className="flex items-center space-x-2 text-muted-foreground">
                                    <Smile className="h-4 w-4 shrink-0" />
                                    <span>Temperaturfølelse: {bath.waterTemperature}</span>
                                </div>
                            )}
                            {!bath.comments && !bath.imageUrl && !bath.waterTemperature && (
                                <p className="italic text-muted-foreground">Ingen detaljer lagt til for dette badet.</p>
                            )}
                        </div>
                    )}
                    {bath.type === 'planned' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{bath.attendees ? bath.attendees.length : 0} påmeldt.</span>
                        </div>
                        {bath.attendees && bath.attendees.length > 0 && <p className="text-muted-foreground">Deltakere: {bath.attendees.map(uid => attendeesDetails[uid]?.name || '...').join(', ')}</p>}

                        {loggedInUser && loggedInUser.uid === bath.userId ? (
                           <Button size="sm" variant="outline" className="mt-2 w-full sm:w-auto" disabled>
                             <Info className="mr-2 h-4 w-4" /> Du arrangerer
                           </Button>
                        ) : loggedInUser && bath.attendees && bath.attendees.includes(loggedInUser.uid) ? (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="mt-2 w-full sm:w-auto" 
                             onClick={() => handleSignOffFromPlannedBath(bath.id, bath.description)}
                           >
                             <UserMinus className="mr-2 h-4 w-4" /> Meld deg av
                           </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="mt-2 w-full sm:w-auto" 
                            onClick={() => handleSignUpForPlannedBath(bath.id, bath.description)}
                            disabled={!loggedInUser}
                          >
                            <UserPlus className="mr-2 h-4 w-4" /> Meld deg på
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Denne brukeren har ingen loggførte bad eller planlagte aktiviteter ennå.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

