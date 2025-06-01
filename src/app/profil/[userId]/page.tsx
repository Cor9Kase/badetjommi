
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
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
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
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logEntries: BathEntry[] = [];

        snapshot.forEach(doc => {
          const data = doc.data() as BathEntry;
          logEntries.push({ ...data, id: doc.id });
           // attendees are stored as plain names
         });
        setBathLog(logEntries);
        setLogLoading(false);
      }, (error) => {
        console.error("Error fetching bath log:", error);
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke laste aktivitetslogg."});
        setLogLoading(false);
      });
      return () => unsubscribe();
    }
  }, [userId, toast]);

  const formatDateForDisplay = (dateInput: string | Timestamp) => {
    try {
      const date =
        dateInput instanceof Timestamp
          ? dateInput.toDate()
          : new Date(dateInput);
      return formatDateFns(date, "d. MMMM yyyy", { locale: nb });
    } catch (e) {
      return String(dateInput);
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
            {user.bio && <CardDescription className="mt-1">{user.bio}</CardDescription>}
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
                      <div className="mb-3 max-w-xs mx-auto">
                        <Image
                          src={bath.imageUrl}
                          alt={`Bad fra ${bath.date}`}
                          width={1080}
                          height={1350}
                          className="w-full h-auto rounded-md object-contain"
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
                        {/* UI elements for attendees and sign-up/sign-off buttons removed */}
                        <p className="italic text-muted-foreground">Detaljer om påmelding vises ikke her lenger.</p>
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

