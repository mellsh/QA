# QA

## 프로젝트 소개
**QA**는 책을 검색하고, 읽다가 마음에 남은 구절만 따로 모아 **해시태그**로 분류하는 문장 수집 서비스입니다.
책 한 권을 다 기억하기는 어렵지만, 밑줄 그은 한 문장은 오래 남는다는 생각으로 만들었습니다.

## 주요 기능
- Google 계정 로그인 (Supabase Auth)
- 책 검색 (제목 · 저자) 및 표지 · 저자 정보 확인
- 책을 골라 인상 깊은 문장 저장 (쪽수, 메모, 해시태그)
- 문장 수정 · 삭제 · 즐겨찾기
- 해시태그 필터, 키워드 검색, 정렬 (최신순 / 오래된순 / 책 제목순)
- 통계: 모은 문장 수, 책 수, 가장 많이 쓴 태그

## Google API
- **Google Books API** (`volumes?q=`)
- 사용자가 입력한 검색어로 책을 검색하고, 응답의 **책 ID, 제목, 저자, 표지 이미지, 출판일**을 검색 결과 화면에 보여 줍니다.
- 사용자가 고른 책의 ID · 제목 · 저자 · 표지는 문장과 함께 DB에 저장되어 내 문장 목록에서 다시 사용됩니다.

## 데이터베이스
- **Supabase (PostgreSQL)**
- `quotes` 테이블: 문장 내용, 쪽수, 메모, 해시태그(배열), 즐겨찾기 여부, 책 정보(ID/제목/저자/표지), 작성 시각, 사용자 ID
- Row Level Security로 **본인이 저장한 문장만** 조회 · 수정 · 삭제할 수 있습니다.
- 테이블 생성 SQL: `supabase/schema.sql`

## 사용 기술
Next.js 14 (App Router) · React 18 · Supabase (Auth, PostgreSQL) · Google Books API · Vercel · GitHub

## 실행 주소
https://(배포 후 여기에 Vercel 주소를 적어 주세요).vercel.app

## 환경 변수
`.env.example` 참고 — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY`
