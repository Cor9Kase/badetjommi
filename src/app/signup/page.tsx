"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Waves } from 'lucide-react';

const GENERATED_EMAIL_DOMAIN = "badekompis.app"; // This domain is used internally for Firebase Auth

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [targetBaths, setTargetBaths] = useState<number>(30);
  const { createUserProfile: authContextCreateUserProfile, setError, setCurrentUser, setUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!username.trim()) {
      toast({ variant: "destructive", title: "Registreringsfeil", description: "Brukernavn er påkrevd." });
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Registreringsfeil", description: "Passordet må være minst 6 tegn."});
      setIsSubmitting(false);
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Registreringsfeil", description: "Passordene stemmer ikke overens." });
      setIsSubmitting(false);
      return;
    }
    if (targetBaths < 1) {
        toast({ variant: "destructive", title: "Registreringsfeil", description: "Mål antall bad må være minst 1."});
        setIsSubmitting(false);
        return;
    }


    const trimmedUsername = username.trim();

    try {
      // Check if username already exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", trimmedUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Registreringsfeil",
          description: "Dette brukernavnet er allerede tatt. Velg et annet.",
        });
        setIsSubmitting(false);
        return;
      }

      // Construct an email for Firebase Auth using the username
      // Firebase Auth requires an email for its email/password sign-in method.
      const localPartForEmail = trimmedUsername.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_.-]/gi, '');
      if (!localPartForEmail) {
          toast({
              variant: "destructive",
              title: "Registreringsfeil",
              description: "Brukernavn er ugyldig. Bruk bokstaver og tall.",
          });
          setIsSubmitting(false);
          return;
      }
      const emailForAuth = `${localPartForEmail}@${GENERATED_EMAIL_DOMAIN}`;

      const userCredential = await createUserWithEmailAndPassword(auth, emailForAuth, password);
      setCurrentUser(userCredential.user); 
      
      const profile = await authContextCreateUserProfile(userCredential.user, trimmedUsername, targetBaths);
      
      if (profile) {
        setUserProfile(profile); 
        toast({
          title: "Registrering Vellykket!",
          description: `Velkommen, ${trimmedUsername}! Din profil er opprettet.`,
        });
        localStorage.setItem('badekompis_needs_onboarding', 'true');
        router.push('/profil');
      } else {
        // Error during profile creation is handled in authContextCreateUserProfile
        // Consider if Firebase Auth user should be deleted if Firestore profile creation fails.
      }

    } catch (error: any) {
      console.error("Signup error details:", error);
      setError(error.message); // Store generic error message from Firebase
      let description = "Kunne ikke opprette bruker. Ukjent feil. Prøv igjen.";
      
      // Firebase Auth error codes
      switch (error.code) {
        case 'auth/email-already-in-use':
          description = "Dette brukernavnet resulterte i en e-post som allerede er i bruk internt. Prøv et annet brukernavn.";
          break;
        case 'auth/weak-password':
          description = "Passordet er for svakt. Velg et sterkere passord (minst 6 tegn).";
          break;
        case 'auth/invalid-email':
           description = `Brukernavnet ('${trimmedUsername}') førte til en ugyldig intern e-postadresse for autentisering. Prøv et annet brukernavn, unngå spesialtegn.`;
           break;
        case 'auth/operation-not-allowed':
          description = "Registrering med brukernavn/passord er ikke aktivert. Kontakt systemadministrator.";
          break;
        case 'auth/network-request-failed':
            description = "Nettverksfeil. Sjekk internettforbindelsen din og prøv igjen.";
            break;
        default:
            // Check for Firestore specific errors (though less likely here than Auth errors)
            if (error.message && error.message.toLowerCase().includes("firestore")) {
                description = "En feil oppstod med databasen under registrering. Prøv igjen.";
            } else if (error.code) { // Generic auth error
                description = `Registrering feilet. (${error.code}). Prøv igjen.`;
            }
      }
       toast({
        variant: "destructive",
        title: "Registreringsfeil",
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
            <UserPlus className="mr-2 h-8 w-8" /> Registrer Bruker
          </CardTitle>
          <CardDescription>Opprett din konto for Badekompis.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Brukernavn</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="fiskemannen_88"
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
                placeholder="Minst 6 tegn"
                required
                minLength={6}
                className="text-base md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft Passord</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Gjenta passord"
                required
                className="text-base md:text-sm"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="targetBaths">Mål antall bad</Label>
              <Input
                id="targetBaths"
                type="number"
                value={targetBaths}
                onChange={(e) => setTargetBaths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="F.eks. 30"
                required
                min="1"
                className="text-base md:text-sm"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Waves className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {isSubmitting ? "Registrerer..." : "Registrer deg"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 text-sm">
          <p>
            Har du allerede bruker?{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Logg inn her
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
