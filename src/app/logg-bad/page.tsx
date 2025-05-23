import { BathLoggingForm } from "@/components/app/bath-logging-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoggBadPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Logg ditt siste bad!</CardTitle>
        </CardHeader>
        <CardContent>
          <BathLoggingForm />
        </CardContent>
      </Card>
    </div>
  );
}
