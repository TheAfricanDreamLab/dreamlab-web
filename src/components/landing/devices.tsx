/*
 * Line drawings of devices with stretch columns inside, as in the case study's grid pages: a
 * tablet, a phone and a laptop. Decorative. Columns carry data-stagger, so a surrounding <Reveal>
 * grows them in one after another.
 */

function Columns({ count, className = '' }: { count: number; className?: string }) {
  return (
    <div className={`flex h-full gap-[6%] px-[6%] ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} data-stagger className="h-full flex-1 origin-bottom rounded-[3px] bg-success-tint ring-1 ring-success-line" />
      ))}
    </div>
  );
}

export function TabletOutline() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-[220px] w-[300px] max-w-full rounded-t-[22px] border-x-2 border-t-2 border-primary px-5 pt-7 sm:h-[240px] sm:w-[340px]"
    >
      <span className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-primary" />
      <div className="h-full rounded-t-[12px] border-x-2 border-t-2 border-primary pt-3">
        <Columns count={6} />
      </div>
    </div>
  );
}

export function PhoneOutline() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-[230px] w-[190px] rounded-t-[34px] border-x-2 border-t-2 border-primary px-2.5 pt-2.5 sm:h-[250px] sm:w-[210px]"
    >
      <span className="absolute -left-[5px] top-[34%] h-10 w-[3px] rounded-full bg-primary" />
      <span className="absolute -left-[5px] top-[56%] h-10 w-[3px] rounded-full bg-primary" />
      <span className="absolute -right-[5px] top-[46%] h-14 w-[3px] rounded-full bg-primary" />
      <div className="relative h-full rounded-t-[26px] border-x-2 border-t-2 border-primary pt-2">
        <span className="absolute left-1/2 top-[-2px] h-5 w-[42%] -translate-x-1/2 rounded-b-[12px] border-x-2 border-b-2 border-primary bg-page" />
        <Columns count={5} className="pt-5" />
      </div>
    </div>
  );
}

export function LaptopOutline() {
  return (
    <div aria-hidden className="mx-auto w-[320px] max-w-full sm:w-[360px]">
      <div className="h-[190px] rounded-t-[16px] border-x-2 border-t-2 border-primary px-4 pt-4 sm:h-[210px]">
        <div className="mb-3 flex gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-primary" />
          <span className="h-2 w-2 rounded-full border-2 border-primary" />
          <span className="h-2 w-2 rounded-full border-2 border-primary" />
        </div>
        <div className="h-[calc(100%-1.25rem)] rounded-t-[8px] border-x-2 border-t-2 border-primary pt-3">
          <Columns count={8} />
        </div>
      </div>
      <div className="relative -mx-6 h-3 rounded-b-[10px] border-2 border-primary">
        <span className="absolute left-1/2 top-[-2px] h-1.5 w-16 -translate-x-1/2 rounded-b-md border-x-2 border-b-2 border-primary bg-page" />
      </div>
    </div>
  );
}
