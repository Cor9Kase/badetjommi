"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth, type UserProfile } from '@/contexts/auth-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Waves } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setError, fetchUserProfile, setCurrentUser, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
        toast({
            variant: "destructive",
            title: "Innloggingsfeil",
            description: "Brukernavn og passord må fylles ut.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
      // Step 1: Query Firestore for the user by their chosen username
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", trimmedUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User with this username does not exist in Firestore
        toast({
          variant: "destructive",
          title: "Innloggingsfeil",
          description: "Brukernavn ikke funnet. Sjekk at du har skrevet riktig, eller registrer deg.",
        });
        setIsSubmitting(false);
        return;
      }

      // Assuming username is unique, there should be only one doc
      const userData = querySnapshot.docs[0].data() as UserProfile;
      const emailForAuth = userData.email; // This is the "username@badekompis.app" email for Firebase Auth

      if (!emailForAuth) {
        // This indicates an issue with the user's record in Firestore (missing internal email)
        toast({
          variant: "destructive",
          title: "Kontoproblem",
          description: "En intern feil oppstod med din konto (autentiserings-e-post mangler). Kontakt support.",
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Attempt to sign in with Firebase Auth using the retrieved internal email and provided password
      const userCredential = await signInWithEmailAndPassword(auth, emailForAuth, password);
      setCurrentUser(userCredential.user);
      const profile = await fetchUserProfile(userCredential.user.uid); 
      if (profile) {
        setUserProfile(profile);
      }
      toast({
        title: "Innlogging Vellykket!",
        description: "Velkommen tilbake!",
      });
      router.push('/profil'); // Or '/' or any other desired page

    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message); // Store generic error message

      let title = "Innloggingsfeil";
      let description = "En uventet feil oppstod. Prøv igjen.";

      if (error.code) { // Firebase Auth errors usually have a code
        switch (error.code) {
          case 'auth/invalid-credential':
            // This error is given by Firebase for wrong password, or if the email (constructed from username) isn't in Auth.
            // Since we found the user in Firestore, it's most likely a wrong password.
            description = "Feil passord. Vennligst prøv igjen.";
            break;
          case 'auth/user-disabled':
            description = "Denne brukerkontoen er deaktivert.";
            break;
          case 'auth/too-many-requests':
            description = "For mange innloggingsforsøk. Prøv igjen senere, eller tilbakestill passordet ditt (hvis funksjon finnes).";
            break;
          case 'auth/network-request-failed':
            description = "Nettverksfeil. Sjekk internettforbindelsen din og prøv igjen.";
            break;
          case 'auth/user-not-found':
             // This should ideally be caught by the Firestore check earlier.
             // If it occurs here, it implies an inconsistency between Firestore and Firebase Auth.
            description = "Bruker ikke funnet i autentiseringssystemet. Dette er uventet. Prøv å registrere deg på nytt eller kontakt support.";
            break;
          default:
            // For other Firebase Auth errors or unknown errors
            description = `En feil oppstod under innlogging (${error.code || 'ukjent feil'}). Prøv igjen.`;
        }
      } else if (error.message && error.message.toLowerCase().includes("firestore")) {
        title = "Databasefeil";
        description = "Kunne ikke koble til databasen for å verifisere bruker. Prøv igjen senere.";
      }
      
      toast({
        variant: "destructive",
        title: title,
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-full py-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center">
            <LogIn className="mr-2 h-8 w-8" /> Logg Inn
          </CardTitle>
          <CardDescription>Logg inn for å fortsette til Badekompis.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Brukernavn</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ditt brukernavn"
                required
                className="text-base md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-base md:text-sm"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Waves className="mr-2 h-5 w-5 animate-spin" /> : "Logg Inn"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <p>
            Har du ikke bruker?{' '}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Registrer deg her
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
