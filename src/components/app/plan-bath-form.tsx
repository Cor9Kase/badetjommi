
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarIcon, Clock, MapPin, Users, FileText, Send, Waves } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { CreatePlannedBathDTO } from "@/types/bath";
import { useRouter } from "next/navigation";


const planBathSchema = z.object({
  date: z.date({
    required_error: "Dato for badet er påkrevd.",
  }).min(new Date(new Date().setHours(0,0,0,0)), { message: "Dato kan ikke være i fortiden." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Ugyldig tidsformat. Bruk TT:MM.",
  }),
  location: z.string().min(1, { message: "Sted er påkrevd." }),
  description: z.string().min(1, { message: "Beskrivelse/Tittel for badet er påkrevd." }),
  invitedGuestsText: z.string().optional(), 
});

type PlanBathFormValues = z.infer<typeof planBathSchema>;

export function PlanBathForm() {
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  // initialTime not strictly needed due to useEffect setting form values
  // const [initialTime, setInitialTime] = useState<string>("");


  const form = useForm<PlanBathFormValues>({
    resolver: zodResolver(planBathSchema),
    defaultValues: {
      date: new Date(), // Defaulted and refined in useEffect
      time: new Date().toLocaleTimeString('nb-NO', {hour: '2-digit', minute: '2-digit'}), // Defaulted and refined
      location: "",
      description: "",
      invitedGuestsText: "tar du med kaffe?",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast({ title: "Vennligst logg inn", description: "Du må være logget inn for å planlegge et bad.", variant: "destructive"});
      router.push('/login');
    }
  }, [currentUser, authLoading, router, toast]);

  useEffect(() => {
    // Set initial date and time on client-side after hydration to avoid mismatch
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1); // Default to tomorrow
    setInitialDate(tomorrow); // For Calendar component's initial display
    form.setValue('date', tomorrow, { shouldValidate: true });

    const timeNowForSuggestion = new Date();
    const minutes = timeNowForSuggestion.getMinutes();
    if (minutes < 30) {
        timeNowForSuggestion.setMinutes(30);
    } else {
        timeNowForSuggestion.setHours(timeNowForSuggestion.getHours() + 1);
        timeNowForSuggestion.setMinutes(0);
    }
    timeNowForSuggestion.setSeconds(0);
    timeNowForSuggestion.setMilliseconds(0);
    const suggestedTime = timeNowForSuggestion.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    form.setValue('time', suggestedTime, { shouldValidate: true });
    
  }, [form]); // Run only once on mount


  async function onSubmit(data: PlanBathFormValues) {
    if (!currentUser || !userProfile) {
        toast({ variant: "destructive", title: "Feil", description: "Du må være logget inn." });
        return;
    }
    setIsSubmitting(true);

    const plannedBathData: CreatePlannedBathDTO = { 
      type: 'planned',
      userId: currentUser.uid, 
      userName: userProfile.name, 
      userAvatar: userProfile.avatarUrl || "", 
      date: format(data.date, "yyyy-MM-dd"), 
      time: data.time,
      location: data.location,
      description: data.description,
      attendees: [currentUser.uid], 
      createdAt: Date.now(), 
    };

    try {
        await addDoc(collection(db, "baths"), plannedBathData);
        toast({
          title: "Bad Planlagt!",
          description: (
            <div className="flex flex-col">
              <span>Tittel: {data.description}</span>
              <span>Dato: {format(data.date, "PPP", { locale: nb })} kl. {data.time}</span>
              <span>Sted: {data.location}</span>
            </div>
          ),
          variant: "default",
        });

        // Reset form with new client-side generated defaults
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const timeNowForSuggestion = new Date();
        const minutes = timeNowForSuggestion.getMinutes();
        if (minutes < 30) {
            timeNowForSuggestion.setMinutes(30);
        } else {
            timeNowForSuggestion.setHours(timeNowForSuggestion.getHours() + 1);
            timeNowForSuggestion.setMinutes(0);
        }
        const suggestedTime = timeNowForSuggestion.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

        form.reset({
          date: tomorrow,
          time: suggestedTime,
          location: "",
          description: "",
          invitedGuestsText: "tar du med kaffe?",
        });
        router.push('/'); 
    } catch (error) {
        console.error("Error planning bath: ", error);
        toast({ variant: "destructive", title: "Planlegging feilet", description: "En feil oppstod." });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (authLoading || !initialDate) { // Also wait for initialDate to avoid hydration issues
    return <div className="flex justify-center items-center p-8"><Waves className="h-8 w-8 animate-spin" /> Laster...</div>;
  }
  if (!currentUser) {
    return <div className="p-4 text-center text-destructive">Du må være logget inn for å planlegge et bad.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <FileText className="mr-2 h-4 w-4" /> Tittel / Kort Beskrivelse
              </FormLabel>
              <FormControl>
                <Input placeholder="F.eks. Morgenbad Sognsvann, Isbade-utfordring" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1 flex items-center"><CalendarIcon className="mr-2 h-4 w-4" />Dato</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: nb })
                        ) : (
                          <span>Velg en dato</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} 
                      initialFocus={!!initialDate}
                      defaultMonth={initialDate}
                      locale={nb}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4" />Tidspunkt</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" /> Sted
              </FormLabel>
              <FormControl>
                <Input placeholder="F.eks., Sognsvann, Oslo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="invitedGuestsText"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Users className="mr-2 h-4 w-4" /> Ekstra Detaljer (Valgfritt notat)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="F.eks. tar du med kaffe?"
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || authLoading || !currentUser}>
          {isSubmitting ? <Waves className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {isSubmitting ? "Planlegger..." : "Planlegg Bad"}
        </Button>
      </form>
    </Form>
  );
}

