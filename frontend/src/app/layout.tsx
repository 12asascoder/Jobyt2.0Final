import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'jobyt - Launch Your Career with the Perfect Role',
  description:
    'Discover internships and fresher jobs that match your passion. Top Indian and global companies are looking for talent exactly like you.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans text-slate-800 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
