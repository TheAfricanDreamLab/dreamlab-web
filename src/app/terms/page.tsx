import { CenteredCard } from '@/components/auth/shells';
import { TextLink } from '@/components/ui/primitives';

export const metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <CenteredCard eyebrow="Draft" eyebrowTone="gold" title="Terms of use" width="wide">
      <p className="text-[14.5px] leading-relaxed">The full terms are being finalised and will appear here before launch.</p>
      <TextLink href="/">Back home</TextLink>
    </CenteredCard>
  );
}
