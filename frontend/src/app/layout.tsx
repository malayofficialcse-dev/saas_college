import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollegeQuery | Student Support Portal',
  description: 'College support requests and ticket management portal.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
