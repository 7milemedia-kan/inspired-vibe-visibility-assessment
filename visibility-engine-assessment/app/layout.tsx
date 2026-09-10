import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const body = Montserrat({ variable: '--font-body', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Visibility Engine Assessment',
  description: 'Measure how effectively your expertise is positioned, captured, distributed, found, and converted into opportunity.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={body.variable}>{children}</body></html>;
}
