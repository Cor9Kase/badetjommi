
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { DocumentData } from 'firebase/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Define a shape for your user profile data stored in Firestore
export interface UserProfile {
  uid: string;
  email: string; // Stores the email used for Firebase Auth (e.g., username@badekompis.app)
  username: string; // The username used for login and display (immutable after creation for login, display part can be 'name')
  name: string; // Display name, initially same as username, can be changed by user in profile settings
  bio?: string;
  avatarUrl?: string;
  targetBaths: number;
  currentBaths: number;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  setCurrentUser: Dispatch<SetStateAction<FirebaseUser | null>>;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  logout: () => Promise<void>;
  fetchUserProfile: (uid: string) => Promise<UserProfile | null>;
  createUserProfile: (user: FirebaseUser, username: string, targetBaths: number) => Promise<UserProfile | null>;
  updateUserProfile: (uid: string, data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Set loading true at the start of auth state change
      setCurrentUser(user);
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (!profile) {
          // User is authenticated, but profile data is missing or couldn't be fetched.
          const profileErrorMsg = "Brukerprofilen din mangler eller kunne ikke lastes. Vennligst prøv å logge ut og inn igjen, eller kontakt support hvis problemet vedvarer.";
          setError(profileErrorMsg);
          toast({
            variant: "destructive",
            title: "Problem med Profil",
            description: "Vi fant ikke profildataene dine. Prøv å logge ut og inn.",
            duration: 10000,
          });
          setUserProfile(null); // Ensure profile is null if fetch failed or profile doesn't exist
        }
        // If profile exists, fetchUserProfile already sets it.
      } else {
        setUserProfile(null);
        setError(null); // Clear any previous errors on logout
      }
      setLoading(false); // Set loading false after all operations are done
    });
    return () => unsubscribe();
  }, []); // Removed dependencies as fetchUserProfile is now part of the flow

  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    // setLoading(true); // Loading state is managed by the onAuthStateChanged effect
    setError(null); // Clear previous fetch errors
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data() as UserProfile;
        setUserProfile(profileData);
        return profileData;
      } else {
        console.warn(`No user profile found for UID: ${uid}. This might happen if Firestore document creation failed after auth user creation.`);
        setUserProfile(null);
        return null;
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError('Kunne ikke hente brukerprofil. Sjekk internettforbindelsen din.');
      toast({ variant: "destructive", title: "Profilfeil", description: "Kunne ikke laste brukerprofil. Sjekk tilkoblingen din." });
      setUserProfile(null);
      return null;
    } finally {
      // setLoading(false); // Loading state is managed by the onAuthStateChanged effect
    }
  };
  
  const createUserProfile = async (
    user: FirebaseUser, 
    username: string, 
    targetBaths: number
  ): Promise<UserProfile | null> => {
    if (!user.email) { 
        setError("Auth email is required to create a profile.");
        toast({ variant: "destructive", title: "Intern Feil", description: "Nødvendig autentiseringsinformasjon (e-post) mangler for profilopprettelse." });
        return null;
    }
    const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email, 
        username: username, 
        name: username, 
        bio: "",
        avatarUrl: "",
        targetBaths: targetBaths,
        currentBaths: 0,
    };
    try {
        await setDoc(doc(db, "users", user.uid), newUserProfile);
        setUserProfile(newUserProfile);
        return newUserProfile;
    } catch (e: any) {
        console.error("Error creating user profile in Firestore: ", e);
        setError(`Kunne ikke opprette profil i databasen: ${e.message}`);
        toast({ variant: "destructive", title: "Databasefeil", description: "Kunne ikke lagre brukerprofilen. Prøv igjen eller kontakt support." });
        return null;
    }
  };

  const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    const { username: loginUsername, email: authEmail, ...updatableData } = data; 

    if (loginUsername && userProfile && loginUsername !== userProfile.username) {
      console.warn("Attempted to change login username (immutable field) during profile update. This is not allowed.");
    }
     if (authEmail && userProfile && authEmail !== userProfile.email) {
      console.warn("Attempted to change internal auth email during profile update. This is not allowed.");
    }

    try {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, updatableData, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...updatableData } : null); 
    } catch (e: any) {
      console.error("Error updating user profile: ", e);
      setError(`Kunne ikke oppdatere profilen: ${e.message}`);
      toast({ variant: "destructive", title: "Oppdateringsfeil", description: "Kunne ikke lagre profilendringer." });
    }
  };


  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setError(null); // Clear errors on logout
      toast({ title: "Logget Ut", description: "Du har blitt logget ut." });
    } catch (err: any) {
      console.error("Error signing out: ", err);
      setError(`Kunne ikke logge ut: ${err.message}`);
      toast({ variant: "destructive", title: "Utloggingsfeil", description: "En feil oppstod under utlogging." });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    setCurrentUser,
    setUserProfile,
    setError,
    logout,
    fetchUserProfile,
    createUserProfile,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
