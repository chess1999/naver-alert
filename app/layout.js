export const metadata = {
  title: '네이버 예약 빈자리 알림',
  description: '네이버 예약 취소표 자동 감시 및 푸시 알림',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#03c75a" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#f5f6f8', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#222' }}>
        {children}
      </body>
    </html>
  );
}
