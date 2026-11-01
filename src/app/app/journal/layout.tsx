import type { ReactNode } from 'react';
import { LearnerArea } from '@/components/app/learner-area';

export default function Layout({ children }: { children: ReactNode }) {
  return <LearnerArea>{children}</LearnerArea>;
}
