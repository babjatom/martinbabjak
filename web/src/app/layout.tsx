import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Book a Session',
  description: 'Slot booking page',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
