/**
 * PageShell — Responsive page container
 *
 * Provides the layout frame for both mobile and desktop:
 * - Mobile / tablet (<1024px): single column, max-w-2xl centered.
 *   The aside (when provided) stacks below the main content.
 * - Desktop (>=1024px): two-column grid — main content + side panel.
 *   The side panel scrolls naturally with the page (no sticky).
 *
 * All page sections share the same horizontal rhythm so edges align.
 */

interface PageShellProps {
  /** Primary content column */
  children: React.ReactNode;
  /** Optional right column — stacks below main on mobile, sidebar on desktop */
  aside?: React.ReactNode;
}

export function PageShell({ children, aside }: PageShellProps) {
  if (!aside) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 md:px-6 lg:px-0">
        <div className="space-y-4 md:space-y-5">{children}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-0">
      {/* Desktop: two-column grid. Mobile/tablet: single column (aside stacks below). */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 lg:gap-6 items-start">
        {/* Main column */}
        <div className="space-y-4 md:space-y-5 min-w-0">{children}</div>

        {/* Side column — visible on all breakpoints, scrolls with the page. */}
        <aside className="space-y-4 md:space-y-5">
          {aside}
        </aside>
      </div>
    </div>
  );
}

/**
 * Section — A titled block within the page
 * The title and content share the same left/right edges.
 */
interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2.5 md:mb-3">
        <h2 className="text-sm md:text-base font-medium text-white/80">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
