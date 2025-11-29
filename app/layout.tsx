import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Twitter Monitor & Summarizer',
  description: 'Monitor Twitter accounts and get AI-powered daily summaries',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
