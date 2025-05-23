import { RealTimeFeed } from "@/components/app/real-time-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Gruppe-Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <RealTimeFeed />
        </CardContent>
      </Card>
    </div>
  );
}
