import './globals.css';

export const metadata = {
  title: 'QA — 책 속 문장 수집함',
  description: '책을 검색하고, 마음에 남은 문장만 모아 해시태그로 정리하세요.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
