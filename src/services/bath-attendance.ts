// Helper functions to join and leave planned baths using Firestore transactions
import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Adds the current user's uid to the attendees array of a bath document.
 * Ensures only the user's uid is added and no other field is modified.
 *
 * @param bathId The id of the bath document
 * @param uid The uid of the user attending
 */
export async function joinBath(bathId: string, uid: string): Promise<void> {
  const bathRef = doc(db, 'baths', bathId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bathRef);
    if (!snap.exists()) {
      throw new Error('Bath does not exist');
    }
    const data = snap.data();
    const current: string[] = (data.attendees ?? []) as string[];
    if (current.includes(uid)) {
      return;
    }
    tx.update(bathRef, { attendees: [...current, uid] });
  });
}

/**
 * Removes the current user's uid from the attendees array of a bath document.
 *
 * @param bathId The id of the bath document
 * @param uid The uid of the user to remove
 */
export async function leaveBath(bathId: string, uid: string): Promise<void> {
  const bathRef = doc(db, 'baths', bathId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bathRef);
    if (!snap.exists()) {
      throw new Error('Bath does not exist');
    }
    const data = snap.data();
    const current: string[] = (data.attendees ?? []) as string[];
    if (!current.includes(uid)) {
      return;
    }
    tx.update(bathRef, { attendees: current.filter((id) => id !== uid) });
  });
}
