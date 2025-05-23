
/**
 * @fileOverview Defines types for bath entries, including logged and planned baths.
 */

export type BathType = 'logged' | 'planned';
export type WaterTemperatureFeeling = "kaldt" | "Passe" | "Digg" | "Glovarmt";

export interface BathBase {
  id: string; // Firestore document ID
  userId: string; // Firebase UID of the user who logged/created.
  userName: string; // Denormalized for easy display
  userAvatar: string; // Denormalized for easy display
  date: string; // ISOString or 'YYYY-MM-DD' for logged. 'YYYY-MM-DD' for planned.
  time: string; // 'HH:MM'
  location?: string;
  createdAt: number; // Timestamp (e.g., Date.now() or Firestore ServerTimestamp) for sorting
}

export interface LoggedBath extends BathBase {
  type: 'logged';
  comments?: string;
  imageUrl?: string; // URL from Firebase Storage
  reactions: { // Consider structuring this as a subcollection if it grows complex
    thumbsUp: number; // Count, or array of UIDs if you want to track who reacted
    heart: number;
    party: number;
  };
  commentCount: number; // Denormalized count, comments could be a subcollection
  waterTemperature?: WaterTemperatureFeeling | null;
}

export interface PlannedBath extends BathBase {
  type: 'planned';
  description: string; // Title or description of the planned event
  attendees: string[]; // Array of user UIDs who are attending
  // invitedGuestsText is part of the form, not necessarily stored directly this way unless needed.
  // It's more of a note during creation.
}

export type BathEntry = LoggedBath | PlannedBath;

// Firestore specific types for creation (omitting id, let Firestore generate)
export type CreateLoggedBathDTO = Omit<LoggedBath, 'id'>;
export type CreatePlannedBathDTO = Omit<PlannedBath, 'id'>;
