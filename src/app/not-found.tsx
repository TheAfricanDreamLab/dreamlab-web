import { CenteredCard } from '@/components/auth/shells';
import { ButtonLink } from '@/components/ui/primitives';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <CenteredCard eyebrow="404" title="We couldn’t find that page" intro="The link may be old, or the page may have moved.">
      <div className="grid gap-2 sm:grid-cols-2">
        <ButtonLink href="/courses" variant="secondary">
          Browse courses
        </ButtonLink>
        <ButtonLink href="/app">My space</ButtonLink>
      </div>
    </CenteredCard>
  );
}
