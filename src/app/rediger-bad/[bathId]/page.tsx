"use client";

import { BathLoggingForm } from "@/components/app/bath-logging-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { LoggedBath } from "@/types/bath";
import { Waves } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditBathPage() {
  const params = useParams();
  const bathId = params?.bathId as string | undefined;
  const router = useRouter();
  const { toast } = useToast();
  const [bath, setBath] = useState<LoggedBath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBath = async () => {
      if (!bathId) return;
      const docRef = doc(db, "baths", bathId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as LoggedBath;
        if (data.type === "logged") {
          setBath({ ...data, id: snap.id });
        } else {
          toast({ variant: "destructive", title: "Ugyldig", description: "Dette er ikke et logget bad." });
          router.push("/");
        }
      } else {
        toast({ variant: "destructive", title: "Ikke funnet", description: "Badet ble ikke funnet." });
        router.push("/");
      }
      setLoading(false);
    };
    fetchBath();
  }, [bathId, router, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Waves className="h-8 w-8 animate-spin" /> Laster...
      </div>
    );
  }

  if (!bath) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Rediger Bad</CardTitle>
        </CardHeader>
        <CardContent>
          <BathLoggingForm existingBath={bath} />
        </CardContent>
      </Card>
    </div>
  );
}
