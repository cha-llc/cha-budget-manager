import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'C.H.A. LLC Budget Manager',
  description: 'AI-Powered Financial Intelligence for C.H.A. LLC',
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
  themeColor: '#1A1A2E',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://vzzzqsmqqaoilkmskadl.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
        margin: 0, padding: 0,
        backgroundColor: '#0d0d1a',
        color: '#fff',
        WebkitFontSmoothing: 'antialiased',
      }}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          @media (max-width: 768px) {
            main { padding: 1rem !important; }
            header { padding: 0 1rem !important; }
            h1 { font-size: 14px !important; }
            .grid-4 { grid-template-columns: 1fr 1fr !important; }
            .grid-3 { grid-template-columns: 1fr 1fr !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
            table { font-size: 11px !important; }
            td, th { padding: 6px 8px !important; }
          }
          @media (max-width: 480px) {
            .grid-4 { grid-template-columns: 1fr !important; }
            .grid-3 { grid-template-columns: 1fr !important; }
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
