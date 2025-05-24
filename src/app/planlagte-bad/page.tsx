"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpcomingPlannedBaths } from "@/components/app/upcoming-planned-baths";

export default function PlannedBathsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Kommende Bad</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingPlannedBaths />
        </CardContent>
      </Card>
    </div>
  );
}

