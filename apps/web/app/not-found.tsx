import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">404 — Page Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Button onClick={() => window.location.href = "/dashboard"}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
