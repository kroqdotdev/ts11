/** Mirrors the studio layout while saved data loads from this browser. */
export function StudioSkeleton() {
  const block = "animate-pulse rounded-[4px]";
  return (
    <div
      className="flex min-h-dvh flex-col bg-grass-deep lg:h-dvh lg:overflow-hidden"
      aria-busy="true"
      aria-label="Loading the studio"
    >
      <div className="flex h-16 shrink-0 items-center gap-4 px-4 lg:px-5">
        {/* Real text in both preloaded faces (Jersey for signage, Archivo for the UI), so
            the preloads are used even when the studio takes a moment to arrive. */}
        <span className="font-signage text-[26px] leading-none text-chalk/80">teamsheet</span>
        <span className="text-[13px] text-chalk/60">Opening the studio…</span>
        <div className={`hidden h-10 w-52 bg-chalk/10 sm:block ${block}`} />
        <div className={`ml-auto hidden h-10 w-44 bg-card/60 lg:block ${block}`} />
      </div>
      <div className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(380px,420px)_1fr] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(380px,420px)_1fr_auto] xl:grid-rows-1">
        <div className="order-1 flex gap-3 overflow-hidden border-y-2 border-card-ink px-4 py-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:px-6 lg:py-3 xl:col-start-3 xl:flex-col xl:border-b-0 xl:border-l-2 xl:px-4 xl:py-4">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex shrink-0 flex-col gap-2">
              <div className={`size-[92px] bg-chalk/10 ${block}`} />
              <div className={`h-3 w-16 bg-chalk/10 ${block}`} />
            </div>
          ))}
        </div>
        <div className="pixel-stage order-2 grid h-[52dvh] place-items-center border-b-2 border-card-ink p-4 lg:order-none lg:col-start-2 lg:row-start-2 lg:h-auto lg:border-b-0 lg:px-6 lg:pt-6 lg:pb-4 xl:row-start-1 xl:border-t-2">
          <div className={`aspect-[4/5] h-full max-h-[80vh] bg-chalk/10 ${block}`} />
        </div>
        <div className="order-3 flex flex-col bg-paper lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:border-t-2 lg:border-r-2 lg:border-card-ink xl:row-span-1">
          <div className="hidden gap-1 border-b-2 border-card-ink bg-well px-2 pt-2 lg:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`h-11 flex-1 bg-rule/60 ${block}`} />
            ))}
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className={`h-7 w-28 bg-well ${block}`} />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`h-11 bg-well ${block}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
