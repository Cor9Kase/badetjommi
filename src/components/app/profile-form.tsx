
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useState, type ChangeEvent, useEffect, useRef } from "react";
import { ImagePlus, Save, Target, LogIn, LogOut, Waves } from "lucide-react"; // Added LogOut and Waves
import { useAuth, type UserProfile } from "@/contexts/auth-context";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";

const profileFormSchema = z.object({
  name: z.string().min(2, { 
    message: "Navn må være minst 2 tegn.",
  }),
  bio: z.string().max(160, { message: "Bio kan ikke være lenger enn 160 tegn." }).optional().nullable(),
  avatar: z.instanceof(File).optional().nullable(), 
  targetBaths: z.coerce.number().min(1, {message: "Målet må være minst 1 bad."}).max(1000, {message: "Målet kan ikke være mer enn 1000 bad."}),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
    // Default values are now primarily sourced from userProfile via useAuth
}

export function ProfileForm({}: ProfileFormProps) {
  const { toast } = useToast();
  const { currentUser, userProfile, updateUserProfile, loading, logout } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        name: "", 
        bio: "",
        targetBaths: 30,
        avatar: null, 
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || "", 
        bio: userProfile.bio || "",
        targetBaths: userProfile.targetBaths || 30,
        avatar: null, 
      });
      setPreviewImage(userProfile.avatarUrl || null);
    }
  }, [userProfile, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!currentUser || !userProfile) {
      toast({ variant: "destructive", title: "Feil", description: "Du må være logget inn for å oppdatere profilen." });
      return;
    }
    setIsSubmitting(true);

    let avatarUrl = userProfile.avatarUrl; 

    if (data.avatar) {
      try {
        const avatarRef = ref(storage, `avatars/${currentUser.uid}/${data.avatar.name}`);
        const snapshot = await uploadBytes(avatarRef, data.avatar);
        avatarUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading avatar:", error);
        toast({ variant: "destructive", title: "Feil ved bildeopplasting", description: "Kunne ikke laste opp nytt profilbilde." });
        setIsSubmitting(false);
        return;
      }
    }

    const profileUpdateData: Partial<UserProfile> = {
      name: data.name,
      bio: data.bio ?? "", 
      targetBaths: data.targetBaths,
      avatarUrl: avatarUrl || "", 
    };
    
    try {
        await updateUserProfile(currentUser.uid, profileUpdateData);
        toast({
            title: "Profil Oppdatert!",
            description: "Endringene dine er lagret.",
        });
        form.setValue('avatar', null); 
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }

    } catch (error) {
        console.error("Error updating profile in onSubmit:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("avatar", file, { shouldValidate: true }); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("avatar", null); 
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading && !userProfile) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-400px)]">
            <Waves className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Laster profildata...</p>
        </div>
    );
  }

  if (!currentUser || !userProfile) {
     return (
      <div className="text-center py-10">
        <p className="mb-4">Vennligst logg inn for å se og redigere profilen din.</p>
        <Button onClick={() => router.push('/login')}>
          <LogIn className="mr-2 h-4 w-4" /> Til Innlogging
        </Button>
      </div>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="avatar"
            render={({ field }) => ( 
            <FormItem>
                <FormLabel className="flex items-center text-base">
                    <ImagePlus className="mr-2 h-5 w-5" /> Profilbilde (Valgfritt)
                </FormLabel>
                {previewImage && (
                    <div className="my-4 flex justify-center">
                        <Image
                        src={previewImage}
                        alt="Profilbilde forhåndsvisning"
                        width={120}
                        height={120}
                        className="rounded-full object-cover h-32 w-32 border-4 border-primary shadow-md"
                        data-ai-hint="brukerprofil avatar"
                        />
                    </div>
                )}
                <FormControl>
                <Input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Brukernavn / Visningsnavn</FormLabel>
              <FormControl>
                <Input placeholder="Ditt brukernavn" {...field} className="text-base md:text-sm"/>
              </FormControl>
               <FormDescription>
                Dette er navnet som vises til andre brukere. 
                {userProfile?.username && userProfile.username !== field.value && ` Ditt opprinnelige brukernavn for innlogging (${userProfile?.username}) kan ikke endres.`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Bio (Valgfritt)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Fortell litt om deg selv og din badeinteresse!"
                  className="resize-none text-base md:text-sm"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetBaths"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center text-base">
                <Target className="mr-2 h-5 w-5" /> Mål for Antall Bad
              </FormLabel>
              <FormControl>
                <Input type="number" placeholder="F.eks. 30" {...field} className="text-base md:text-sm"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-base py-3 px-6" disabled={isSubmitting || loading}>
            {isSubmitting ? <Waves className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isSubmitting ? "Lagrer..." : "Lagre Endringer"}
            </Button>
            <Button type="button" variant="outline" onClick={handleLogout} className="w-full sm:w-auto text-base py-3 px-6" disabled={loading || isSubmitting}>
                <LogOut className="mr-2 h-5 w-5" />
                Logg ut
            </Button>
        </div>
      </form>
    </Form>
  );
}
