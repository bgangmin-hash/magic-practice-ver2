export const metadata = {
  title: 'Magic Practice',
  description: '마술 연습 기록 — 3분 타이머와 함께 매일 수련하세요',
};

export const viewport = {
  themeColor: '#0a0815',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0815' }}>{children}</body>
    </html>
  );
}
