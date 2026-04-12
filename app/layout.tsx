import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'C.H.A. LLC Budget Manager',
  description: 'Personalized AI Budget Management System for C.H.A. LLC',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: 0,
        padding: 0,
        backgroundColor: '#f5f3f0',
        color: '#1A1A2E',
      }}>
        {children}
      </body>
    </html>
  );
}
