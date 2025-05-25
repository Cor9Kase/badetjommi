import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  query,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { BathSignup } from "@/types/signup"; // Updated import

/**
 * Signs up a user for a specific bath.
 * Creates a document in the baths/{bathId}/signups subcollection.
 *
 * @param bathId The ID of the bath to sign up for.
 * @param userId The UID of the user signing up.
 * @param displayName The display name of the user signing up.
 * @returns A promise that resolves when the signup is complete.
 */
export async function signUpForBath(bathId: string, userId: string, displayName: string): Promise<void> {
  const signupDocRef = doc(db, "baths", bathId, "signups", userId);
  await setDoc(signupDocRef, {
    userId: userId,
    displayName: displayName,
    signedUpAt: serverTimestamp(),
  });
}

/**
 * Cancels a user's signup for a specific bath.
 * Deletes the document from baths/{bathId}/signups/{userId}.
 *
 * @param bathId The ID of the bath.
 * @param userId The UID of the user whose signup is to be canceled.
 * @returns A promise that resolves when the signup is canceled.
 */
export async function cancelSignUp(bathId: string, userId: string): Promise<void> {
  const signupDocRef = doc(db, "baths", bathId, "signups", userId);
  await deleteDoc(signupDocRef);
}

/**
 * Fetches all signups for a specific bath, ordered by signup time.
 *
 * @param bathId The ID of the bath.
 * @returns A promise that resolves to an array of BathSignup objects.
 */
export async function getBathSignups(bathId: string): Promise<BathSignup[]> {
  const signupsColRef = collection(db, "baths", bathId, "signups");
  const q = query(signupsColRef, orderBy("signedUpAt", "asc"));
  const snapshot = await getDocs(q);

  const signups: BathSignup[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    signups.push({
      id: docSnap.id, // This is the userId
      userId: data.userId,
      displayName: data.displayName,
      signedUpAt: data.signedUpAt as Timestamp, // Assuming it's already a Timestamp
    });
  });

  return signups;
}
