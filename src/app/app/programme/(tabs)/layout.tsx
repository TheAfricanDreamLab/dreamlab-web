import type { ReactNode } from 'react';
import { ProgrammeTabs } from '../_components/programme-tabs';

/** My programme and its sub-pages: one title, one row of tabs, then the page. */
export default function ProgrammeTabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-4">
        <h1 className="text-[28px] font-extrabold leading-tight">My programme</h1>
        <ProgrammeTabs />
      </header>
      {children}
    </div>
  );
}
