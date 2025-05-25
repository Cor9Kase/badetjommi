// Helper functions to join and leave planned baths using Firestore transactions
import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Adds the given user name to the attendees array of a bath document.
 * Ensures only the name is added and no other field is modified.
 *
 * @param bathId The id of the bath document
 * @param name The name of the user attending
 */
export async function joinBath(bathId: string, name: string): Promise<void> {
  if (!name) {
    throw new Error('User must be logged in');
  }
  const bathRef = doc(db, 'baths', bathId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bathRef);
    if (!snap.exists()) {
      throw new Error('Bath does not exist');
    }
    const data = snap.data();
    const current: string[] = (data.attendees ?? []) as string[];
    if (current.includes(name)) {
      return;
    }
    tx.update(bathRef, { attendees: [...current, name] });
  });
}

/**
 * Removes the given user name from the attendees array of a bath document.
 *
 * @param bathId The id of the bath document
 * @param name The name of the user to remove
 */
export async function leaveBath(bathId: string, name: string): Promise<void> {
  if (!name) {
    throw new Error('User must be logged in');
  }
  const bathRef = doc(db, 'baths', bathId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bathRef);
    if (!snap.exists()) {
      throw new Error('Bath does not exist');
    }
    const data = snap.data();
    const current: string[] = (data.attendees ?? []) as string[];
    if (!current.includes(name)) {
      return;
    }
    tx.update(bathRef, { attendees: current.filter((n) => n !== name) });
  });
}

