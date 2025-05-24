"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NotificationContextType {
  newFeed: boolean;
  newPlanned: boolean;
  markFeedSeen: () => void;
  markPlannedSeen: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [latestFeed, setLatestFeed] = useState<number>(0);
  const [latestPlanned, setLatestPlanned] = useState<number>(0);

  const [feedLastSeen, setFeedLastSeen] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("lastSeenFeed") || "0");
    }
    return 0;
  });

  const [plannedLastSeen, setPlannedLastSeen] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("lastSeenPlanned") || "0");
    }
    return 0;
  });

  useEffect(() => {
    const feedQuery = query(collection(db, "baths"), orderBy("createdAt", "desc"), limit(1));
    const unsubFeed = onSnapshot(feedQuery, (snap) => {
      const data = snap.docs[0]?.data();
      if (data && data.createdAt) {
        setLatestFeed(data.createdAt);
      }
    });

    const plannedQuery = query(collection(db, "baths"), orderBy("createdAt", "desc"), limit(5));
    const unsubPlanned = onSnapshot(plannedQuery, (snap) => {
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.type === "planned" && data.createdAt) {
          setLatestPlanned(data.createdAt);
          break;
        }
      }
    });

    return () => {
      unsubFeed();
      unsubPlanned();
    };
  }, []);

  const markFeedSeen = () => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSeenFeed", String(now));
    }
    setFeedLastSeen(now);
  };

  const markPlannedSeen = () => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSeenPlanned", String(now));
    }
    setPlannedLastSeen(now);
  };

  const newFeed = latestFeed > feedLastSeen;
  const newPlanned = latestPlanned > plannedLastSeen;

  return (
    <NotificationContext.Provider value={{ newFeed, newPlanned, markFeedSeen, markPlannedSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
};
