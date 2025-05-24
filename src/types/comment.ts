export interface BathComment {
  id: string; // Firestore document ID
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: number; // Timestamp for sorting
}

export type CreateBathCommentDTO = Omit<BathComment, 'id'>;
