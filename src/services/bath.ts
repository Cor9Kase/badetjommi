import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

/**
 * Deletes a bath document from Firestore.
 * Only the creator of the bath is allowed to perform this action according to security rules.
 *
 * @param bathId - The ID of the bath to delete.
 */
export async function deleteBath(bathId: string): Promise<void> {
  const bathDocRef = doc(db, "baths", bathId);
  await deleteDoc(bathDocRef);
}
