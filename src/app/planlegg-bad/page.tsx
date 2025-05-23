import { PlanBathForm } from "@/components/app/plan-bath-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

export default function PlanleggBadPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center">
            <CalendarClock className="mr-3 h-7 w-7" />
            Planlegg et Nytt Bad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlanBathForm />
        </CardContent>
      </Card>
    </div>
  );
}

    