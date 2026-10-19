import type { Metadata, Viewport } from 'next';
import { Figtree, JetBrains_Mono, Outfit } from 'next/font/google';
import './globals.css';

// All three are variable fonts: one file covers every weight, so no weight list.
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'The African Dream Lab', template: '%s · The African Dream Lab' },
  description: 'A learning management platform born from TADIS, the African Dream Network International Summit. Courses, cohorts and certificates for learners, schools and teams.',
};

export const viewport: Viewport = { themeColor: '#0a3d29' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
