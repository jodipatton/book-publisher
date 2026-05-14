import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoiceAtelier',
  description: 'Voice-driven fashion design — your proportions are the canvas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
