import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="container px-4 sm:px-6 pb-16 pt-20 sm:pt-24 lg:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
