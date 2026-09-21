import { JourneyStepper } from "./JourneyStepper";

/**
 * Shared frame for the three product pages: a consistent header band with the
 * page's title, one line of orientation, and the journey stepper.
 */
export function AppShell({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description: string;
  /** Optional control rendered at the right of the header. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header band, subtly separated from the working area below. */}
      <div className="relative overflow-hidden border-b border-border bg-background-alt">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_100%_at_30%_0%,black,transparent)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
            </div>
            {aside}
          </div>
          <div className="mt-7 overflow-x-auto pb-1">
            <JourneyStepper />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
