'use client';

/** Opens the browser's print dialog (where "Save as PDF" lives too). Hidden on paper. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-primary-hover print:hidden">
      Print or save as PDF
    </button>
  );
}
