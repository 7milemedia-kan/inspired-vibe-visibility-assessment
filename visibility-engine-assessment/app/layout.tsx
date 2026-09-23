import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const body = Montserrat({ variable: '--font-body', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Visibility Assessment | Inspired Vibe',
  description: 'Discover your Authority Score and how much buyer trust your expertise builds before the sales call.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={body.variable}>{children}</body></html>;
}
