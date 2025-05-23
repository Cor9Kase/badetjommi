
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListChecks, Waves, Users, Trophy } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function OnboardingModal({ isOpen, onOpenChange }: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Velkommen til Badekompis!</DialogTitle>
          <DialogDescription className="text-center text-md pt-2">
            Klar for å dykke inn i en verden av iskalde gleder og varme fellesskap?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm">
          <p>Med Badekompis kan du:</p>
          <ul className="list-none space-y-2 pl-2">
            <li className="flex items-start">
              <Waves className="h-5 w-5 mr-3 mt-0.5 text-primary shrink-0" />
              <span>Enkelt logge alle dine bad – enten det er isbad eller sommerdukkert.</span>
            </li>
            <li className="flex items-start">
              <ListChecks className="h-5 w-5 mr-3 mt-0.5 text-primary shrink-0" />
              <span>Sette personlige bademål og følge med på din fantastiske progresjon.</span>
            </li>
            <li className="flex items-start">
              <Users className="h-5 w-5 mr-3 mt-0.5 text-primary shrink-0" />
              <span>Planlegge fellesbad og invitere dine badevenner.</span>
            </li>
            <li className="flex items-start">
              <Trophy className="h-5 w-5 mr-3 mt-0.5 text-primary shrink-0" />
              <span>Se hvem som troner øverst på topplisten – kanskje det blir deg?</span>
            </li>
          </ul>
          <p className="pt-2">
            Utforsk appen, logg ditt første bad, og bli en del av Badekompis-fellesskapet!
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => onOpenChange(false)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Kom i gang!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
