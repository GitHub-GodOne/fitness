import { CommentSection } from '@/shared/blocks/common';
import { cn } from '@/shared/lib/utils';

export function Comments({
  section,
  className,
}: {
  section?: any;
  className?: string;
}) {
  return (
    <section
      id={section?.id}
      className={cn('py-24 md:py-36', section?.className, className)}
    >
      <div className="container mx-auto max-w-4xl">
        <CommentSection />
      </div>
    </section>
  );
}
