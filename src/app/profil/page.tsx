"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/app/profile-form";
import { UserProgress } from "@/components/app/user-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle2, Waves, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { OnboardingModal } from "@/components/app/onboarding-modal";
import { Button } from "@/components/ui/button"; // Import Button

export default function ProfilPage() {
  const { currentUser, userProfile, loading, error, logout } = useAuth(); // Added error and logout
  const router = useRouter();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const needsOnboarding = localStorage.getItem('badekompis_needs_onboarding');
      if (needsOnboarding === 'true') {
        setShowOnboardingModal(true);
        localStorage.removeItem('badekompis_needs_onboarding');
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Waves className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Laster profil...</p>
      </div>
    );
  }
  
  // This case handles when auth state is resolved, but no user is logged in.
  // The useEffect above should have redirected, but this is a fallback.
  if (!currentUser && !loading) { 
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Waves className="h-12 w-12 text-primary mb-4" />
        <p className="text-muted-foreground">Du blir videresendt til innlogging...</p>
      </div>
    );
  }

  // This case handles when a user is logged in, auth is not loading, but their profile data couldn't be fetched.
  if (currentUser && !userProfile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Problem med Profil</h2>
        <p className="text-muted-foreground mb-1">
          Vi kunne dessverre ikke laste profildataene dine.
        </p>
        {error && (
            <p className="text-sm text-destructive mb-3">Feilmelding: {error}</p>
        )}
        <p className="text-muted-foreground mb-4">
          Dette kan skyldes et midlertidig problem eller en feil med kontoen din.
        </p>
        <Button onClick={logout} variant="outline" className="mb-2">
          Logg ut og prøv igjen
        </Button>
        <p className="text-xs text-muted-foreground">
            Hvis problemet vedvarer, vennligst kontakt support.
        </p>
      </div>
    );
  }
  // userProfile should exist here; this check appeases TypeScript.
  if (!userProfile) {
    return null;
  }

  return (
    <div className="space-y-8">
      <OnboardingModal isOpen={showOnboardingModal} onOpenChange={setShowOnboardingModal}/>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <UserCircle2 className="mr-3 h-8 w-8 text-primary" />
            Min Profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Min Progresjon</CardTitle>
        </CardHeader>
        <CardContent>
          <UserProgress
            userName={userProfile!.name}
            currentBaths={userProfile!.currentBaths}
            targetBaths={userProfile!.targetBaths}
            userAvatar={userProfile!.avatarUrl}
          />
        </CardContent>
      </Card>
      
      {currentUser && (
         <div className="text-center">
            <Link href={`/profil/${currentUser.uid}`} className="text-sm text-accent hover:underline">
                Se din offentlige profil
            </Link>
         </div>
      )}
    </div>
  );
}
