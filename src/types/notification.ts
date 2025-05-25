import type { Timestamp } from 'firebase/firestore';

export interface UserNotification {
  id: string;          // Firestore document ID
  userId: string;      // UID of the user who should receive this notification
  type: 'new_signup' | 'generic_message' | 'bath_reminder' | string; // Type of notification, extensible
  message: string;     // The notification message content
  link?: string;        // Optional link for navigation (e.g., to a bath details page)
  read: boolean;       // Status: true if read, false if unread
  createdAt: Timestamp;  // Firestore server timestamp of when the notification was created
  relatedEntityType?: 'bath' | 'user' | string; // Optional: type of entity this notification relates to
  relatedEntityId?: string; // Optional: ID of the related entity (e.g., bathId)
}
