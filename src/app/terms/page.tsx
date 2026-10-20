import { CenteredCard } from '@/components/auth/shells';

export const metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <CenteredCard eyebrow="Draft" eyebrowTone="gold" title="Terms of use" width="wide">
      <p className="text-[14.5px] leading-relaxed">The full terms are being finalised and will appear here before launch.</p>
    </CenteredCard>
  );
}
