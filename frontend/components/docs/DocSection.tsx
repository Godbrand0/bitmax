/**
 * One documentation section: an anchored heading plus prose. Typography is
 * set here once rather than repeated per paragraph at every call site.
 */
export function DocSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="group flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
        {title}
        <a
          href={`#${id}`}
          aria-label={`Link to ${title}`}
          className="text-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          #
        </a>
      </h2>
      {lead && <p className="mt-3 text-[15px] leading-relaxed text-muted">{lead}</p>}
      <div className="prose-docs mt-5 flex flex-col gap-4 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}
