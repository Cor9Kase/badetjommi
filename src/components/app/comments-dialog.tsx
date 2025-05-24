"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import type { BathComment, CreateBathCommentDTO } from "@/types/comment";
import { useToast } from "@/hooks/use-toast";

interface CommentsDialogProps {
  bathId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentCount?: number; // optional for local update if needed
}

export function CommentsDialog({ bathId, open, onOpenChange }: CommentsDialogProps) {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<BathComment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!open) return;
    const commentsRef = collection(db, `baths/${bathId}/comments`);
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BathComment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as BathComment;
        items.push({ ...data, id: doc.id });
      });
      setComments(items);
    });
    return () => unsubscribe();
  }, [bathId, open]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser || !userProfile) {
      toast({
        variant: "destructive",
        title: "Logg Inn",
        description: "Du må være logget inn for å kommentere.",
      });
      return;
    }
    const commentData: CreateBathCommentDTO = {
      userId: currentUser.uid,
      userName: userProfile.name,
      userAvatar: userProfile.avatarUrl || "",
      text: newComment.trim(),
      createdAt: Date.now(),
    };
    try {
      await addDoc(collection(db, `baths/${bathId}/comments`), commentData);
      await updateDoc(doc(db, "baths", bathId), { commentCount: increment(1) });
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment: ", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke lagre kommentaren." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kommentarer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {comments.length === 0 && <p className="text-sm text-muted-foreground">Ingen kommentarer ennå.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-2 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarImage src={comment.userAvatar || `https://picsum.photos/seed/${comment.userId}/40/40`} alt={comment.userName} />
                <AvatarFallback>{comment.userName.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{comment.userName}</p>
                <p>{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex flex-col space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Skriv en kommentar"
          />
          <Button onClick={handleAddComment} disabled={!newComment.trim()}>Legg til kommentar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
