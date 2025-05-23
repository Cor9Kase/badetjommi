
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarIcon, ImagePlus, MapPin, Waves, Thermometer, Upload, Camera, VideoOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useState, type ChangeEvent, useEffect, useRef } from "react";
import type { WaterTemperatureFeeling, CreateLoggedBathDTO } from "@/types/bath";
import { useAuth } from "@/contexts/auth-context";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";


const temperatureFeelings: WaterTemperatureFeeling[] = ["kaldt", "Passe", "Digg", "Glovarmt"];
// Ensure there's a default or placeholder value that is not an empty string for the SelectItem
const EMPTY_SELECT_VALUE = "_EMPTY_";


const bathLoggingSchema = z.object({
  date: z.date({
    required_error: "Dato for badet er påkrevd.",
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Ugyldig tidsformat. Bruk TT:MM.",
  }),
  location: z.string().optional(),
  waterTemperature: z.enum(temperatureFeelings as [WaterTemperatureFeeling, ...WaterTemperatureFeeling[]]).optional().nullable(),
  comments: z.string().optional(),
  image: z.instanceof(File).optional().nullable(),
});

type BathLoggingFormValues = z.infer<typeof bathLoggingSchema>;

export function BathLoggingForm() {
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, fetchUserProfile } = useAuth();
  const router = useRouter();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  // initialTime state is not strictly necessary as form defaultValues are set by useEffect.
  // const [initialTime, setInitialTime] = useState<string>("");


  const form = useForm<BathLoggingFormValues>({
    resolver: zodResolver(bathLoggingSchema),
    defaultValues: {
      date: new Date(), // Default to client's current date, will be refined in useEffect
      time: new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }), // Default, refined in useEffect
      location: "",
      waterTemperature: undefined,
      comments: "",
      image: null,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      toast({ title: "Vennligst logg inn", description: "Du må være logget inn for å logge et bad.", variant: "destructive"});
      router.push('/login');
    }
  }, [currentUser, authLoading, router, toast]);
  

  useEffect(() => {
    // Set initial date and time on client-side after hydration
    // This ensures it uses the client's current date/time and avoids hydration mismatch
    const now = new Date();
    setInitialDate(now); // For Calendar component initial display if needed
    form.setValue('date', now, { shouldValidate: true });
    
    const currentTimeFormatted = now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    form.setValue('time', currentTimeFormatted, { shouldValidate: true });

  }, [form]); // Run only once on mount


  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (isCameraDialogOpen) {
      setHasCameraPermission(null); 
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          currentStream = stream;
          setHasCameraPermission(true);
          setCameraStream(stream); 
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Kameratilgang Nektet',
            description: 'Vennligst aktiver kameratilgang i nettleserinnstillingene dine.',
          });
        }
      };
      getCameraPermission();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
         videoRef.current.srcObject = null; 
      }
      setCameraStream(null); 
    };
  }, [isCameraDialogOpen, toast]);


  async function onSubmit(data: BathLoggingFormValues) {
    if (!currentUser || !userProfile) {
        toast({ variant: "destructive", title: "Feil", description: "Du må være logget inn." });
        return;
    }
    setIsSubmitting(true);

    let imageUrl: string | undefined = undefined;
    if (data.image) {
        try {
            const imageFileName = `baths/${currentUser.uid}/${Date.now()}-${data.image.name}`;
            const imageStorageRef = storageRef(storage, imageFileName);
            const uploadResult = await uploadBytes(imageStorageRef, data.image);
            imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (error) {
            console.error("Error uploading image: ", error);
            toast({ variant: "destructive", title: "Bildeopplasting feilet", description: "Kunne ikke laste opp bildet." });
            setIsSubmitting(false);
            return;
        }
    }

    const bathData: CreateLoggedBathDTO = {
        userId: currentUser.uid,
        userName: userProfile.name,
        userAvatar: userProfile.avatarUrl || "",
        date: format(data.date, "yyyy-MM-dd"),
        time: data.time,
        location: data.location || "",
        waterTemperature: data.waterTemperature || null,
        comments: data.comments || "",
        imageUrl: imageUrl,
        reactions: { thumbsUp: 0, heart: 0, party: 0 },
        commentCount: 0,
        createdAt: Date.now(), 
        type: 'logged',
    };

    try {
        await addDoc(collection(db, "baths"), bathData);
        
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, {
            currentBaths: increment(1)
        });
        await fetchUserProfile(currentUser.uid);


        toast({
            title: "Bad Logget!",
            description: `Ditt bad ${data.location ? `ved ${data.location}` : ''} er logget.`,
            variant: "default",
        });
        
        // Reset to new current date/time for next logging
        const now = new Date();
        form.reset({
            date: now,
            time: now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
            location: "",
            waterTemperature: undefined,
            comments: "",
            image: undefined,
        });
        setPreviewImage(null);
        router.push('/'); 
    } catch (error) {
        console.error("Error logging bath: ", error);
        toast({ variant: "destructive", title: "Loggføring feilet", description: "En feil oppstod." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("image", null);
      setPreviewImage(null);
    }
  };

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `badebevis-${Date.now()}.jpg`, { type: 'image/jpeg' });
            form.setValue("image", file);
            setPreviewImage(canvas.toDataURL('image/jpeg'));
          }
        }, 'image/jpeg');
      }
      setIsCameraDialogOpen(false); 
    } else {
        toast({
            variant: 'destructive',
            title: 'Kamerafeil',
            description: 'Kunne ikke ta bilde. Video er ikke klar. Prøv igjen eller sjekk kameratilgang.',
        });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (authLoading || !initialDate) { // Also wait for initialDate to be set to prevent hydration issues
    return <div className="flex justify-center items-center p-8"><Waves className="h-8 w-8 animate-spin" /> Laster...</div>;
  }
  if (!currentUser) {
    return <div className="p-4 text-center text-destructive">Du må være logget inn for å logge et bad.</div>;
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Dato for badet</FormLabel>
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus={!!initialDate} // focus if initialDate is set
                      defaultMonth={initialDate} // Start calendar at current month
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
                <FormLabel>Tidspunkt for badet</FormLabel>
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
                <MapPin className="mr-2 h-4 w-4" /> Sted (Valgfritt)
              </FormLabel>
              <FormControl>
                <Input
                    placeholder="F.eks., Sognsvann, Oslo"
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
          name="waterTemperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Thermometer className="mr-2 h-4 w-4" /> Temperaturfølelse (Valgfritt)
              </FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? null : value)} 
                value={field.value ?? EMPTY_SELECT_VALUE}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Hvordan føltes vannet?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>Velg følelse (eller la stå)</SelectItem>
                  {temperatureFeelings.map((feeling) => (
                     <SelectItem key={feeling} value={feeling}>{feeling.charAt(0).toUpperCase() + feeling.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kommentarer (Valgfritt)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Hvordan var vannet? Noen episke historier?"
                  className="resize-none"
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
          name="image"
          render={({ field: { onChange, value, ...restField }}) => ( 
            <FormItem>
              <FormLabel className="flex items-center">
                <ImagePlus className="mr-2 h-4 w-4" /> Bildebevis (Valgfritt)
              </FormLabel>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" /> Last opp fil
                </Button>
                <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    {...restField}
                />
                <Button type="button" variant="outline" onClick={() => setIsCameraDialogOpen(true)} className="w-full sm:w-auto">
                  <Camera className="mr-2 h-4 w-4" /> Ta bilde
                </Button>
              </div>
              {previewImage && (
                <div className="mt-4">
                  <Image
                    src={previewImage}
                    alt="Forhåndsvisning av bildebevis"
                    width={200}
                    height={200}
                    className="rounded-md object-cover"
                    data-ai-hint="badebilde forhåndsvisning"
                  />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <canvas ref={canvasRef} className="hidden"></canvas>


        <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || authLoading || !currentUser}>
          {isSubmitting ? <Waves className="mr-2 h-5 w-5 animate-spin" /> : <Waves className="mr-2 h-5 w-5" />}
          {isSubmitting ? "Logger bad..." : "Logg Bad"}
        </Button>
      </form>

      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ta Bildebevis</DialogTitle>
          </DialogHeader>
          <div className="py-4">
             <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            {hasCameraPermission === null && <p className="text-center text-muted-foreground mt-2">Ber om kameratilgang...</p>}
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Kameratilgang Nektet</AlertTitle>
                  <AlertDescription>
                    Du må gi tilgang til kameraet i nettleserinnstillingene for å bruke denne funksjonen. Last siden på nytt etter å ha gitt tilgang.
                  </AlertDescription>
                </Alert>
            )}
             {hasCameraPermission === true && !cameraStream && ( 
                <div className="flex flex-col items-center justify-center text-muted-foreground aspect-video bg-muted rounded-md h-full">
                    <VideoOff className="w-16 h-16 mb-2" />
                    <p>Starter kamera... Vent litt.</p>
                </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">Avbryt</Button>
            </DialogClose>
            <Button type="button" onClick={handleCaptureImage} disabled={!hasCameraPermission || !cameraStream || isSubmitting} className="w-full sm:w-auto">
              <Camera className="mr-2 h-4 w-4" /> Knytt Bilde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

