import { CenteredCard } from '@/components/auth/shells';

export const metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <CenteredCard eyebrow="Draft" eyebrowTone="gold" title="Privacy policy" width="wide">
      <p className="text-[14.5px] leading-relaxed">
        Our privacy policy, written for the Nigeria Data Protection Act 2023, is being finalised and will appear here before launch.
      </p>
    </CenteredCard>
  );
}
