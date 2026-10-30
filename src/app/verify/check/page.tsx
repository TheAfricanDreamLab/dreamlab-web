import type { Metadata } from 'next';
import { VerifyForm } from '@/components/outcomes/outcome-forms';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { Card, Eyebrow } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Check a credential' };

/** Anyone can check a Dream Lab credential by its code (CRED-1). */
export default function VerifyPage() {
  return (
    <div className="min-h-dvh">
      <PublicHeader next="/verify/check" />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="space-y-2">
          <Eyebrow tone="gold">Credentials</Eyebrow>
          <h1 className="text-[30px] font-extrabold">Check a credential</h1>
          <p className="text-[15px] text-body">Type the code printed on a Dream Lab certificate to see who it was issued to, for what, and whether it still stands.</p>
        </div>
        <Card className="p-5">
          <VerifyForm />
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
