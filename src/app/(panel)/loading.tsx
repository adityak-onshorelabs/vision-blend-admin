/** Shown the moment a screen is opened from the sidebar, until its content arrives */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid animate-pulse gap-10">
      <div className="grid gap-3 border-b border-border pb-8">
        <div className="h-12 w-2/3 max-w-[420px] bg-border/70" />
        <div className="h-4 w-full max-w-[56ch] bg-border/50" />
        <div className="h-4 w-1/2 max-w-[30ch] bg-border/50" />
      </div>
      <div className="grid gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 border-b border-border bg-border/30" />
        ))}
      </div>
    </div>
  );
}
