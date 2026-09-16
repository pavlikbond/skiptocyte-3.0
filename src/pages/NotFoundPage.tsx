import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That route does not exist.</p>
      <Button className="mt-4" asChild>
        <Link to="/">Home</Link>
      </Button>
    </div>
  );
}
