import type { Timestamp } from 'firebase/firestore';

export interface BathSignup {
  id: string;          // Document ID (which is the userId)
  userId: string;      // UID of the user who signed up
  displayName: string; // Display name of the user
  signedUpAt: Timestamp; // Firestore Timestamp of when they signed up
}
