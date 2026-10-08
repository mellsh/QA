'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const BOOKS_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

const parseTags = (s) => [
  ...new Set(
    s.split(/[\s,]+/).map((t) => t.replace(/^#+/, '').trim().toLowerCase()).filter(Boolean)
  ),
];

// Google Books API: 책 검색
async function searchBooks(q) {
  const url =
    'https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(q) +
    '&maxResults=12&printType=books' + (BOOKS_KEY ? '&key=' + BOOKS_KEY : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('책 검색에 실패했어요 (' + res.status + '). API 키를 확인해 주세요.');
  const json = await res.json();
  return (json.items || []).map((it) => ({
    book_id: it.id,
    book_title: it.volumeInfo.title || '제목 없음',
    book_authors: (it.volumeInfo.authors || []).join(', '),
    book_thumbnail: (it.volumeInfo.imageLinks?.thumbnail || '').replace('http://', 'https://'),
    published: it.volumeInfo.publishedDate || '',
  }));
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = () =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });

  if (!ready) return <div className="center">불러오는 중…</div>;
  if (!user)
    return (
      <div className="center login">
        <h1>QA</h1>
        <p className="lead">읽다가 밑줄 긋고 싶던 문장,<br />여기에 모아 두세요.</p>
        <button className="primary" onClick={login}>Google로 시작하기</button>
      </div>
    );
  return <App user={user} />;
}

function App({ user }) {
  const [tab, setTab] = useState('quotes');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('new');
  const [favOnly, setFavOnly] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) setErr(error.message);
    else setQuotes(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (payload, id) => {
    const r = id
      ? await supabase.from('quotes').update(payload).eq('id', id)
      : await supabase.from('quotes').insert(payload);
    if (r.error) { alert('저장하지 못했어요: ' + r.error.message); return false; }
    await load();
    return true;
  };
  const remove = async (id) => {
    if (!confirm('이 문장을 삭제할까요?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    load();
  };
  const toggleFav = async (x) => {
    await supabase.from('quotes').update({ is_favorite: !x.is_favorite }).eq('id', x.id);
    load();
  };

  const tagCounts = useMemo(() => {
    const m = {};
    quotes.forEach((x) => x.tags.forEach((t) => (m[t] = (m[t] || 0) + 1)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [quotes]);

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    let r = quotes.filter(
      (x) =>
        (!tag || x.tags.includes(tag)) &&
        (!favOnly || x.is_favorite) &&
        (!needle || (x.content + ' ' + x.book_title + ' ' + (x.memo || '')).toLowerCase().includes(needle))
    );
    if (sort === 'old') r = [...r].reverse();
    if (sort === 'book') r = [...r].sort((a, b) => a.book_title.localeCompare(b.book_title));
    return r;
  }, [quotes, q, tag, sort, favOnly]);

  const bookCount = new Set(quotes.map((x) => x.book_id)).size;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>QA</h1>
          <p>책 속 문장 수집함</p>
        </div>
        <div className="who">
          <span>{user.user_metadata?.name || user.email}</span>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>로그아웃</button>
        </div>
      </header>

      <section className="stats">
        <div><b>{quotes.length}</b><span>모은 문장</span></div>
        <div><b>{bookCount}</b><span>책</span></div>
        <div><b>{tagCounts[0] ? '#' + tagCounts[0][0] : '-'}</b><span>가장 많이 쓴 태그</span></div>
      </section>

      <nav className="tabs">
        <button className={tab === 'quotes' ? 'on' : ''} onClick={() => setTab('quotes')}>내 문장</button>
        <button className={tab === 'search' ? 'on' : ''} onClick={() => setTab('search')}>책 검색</button>
      </nav>

      {err && <p className="err">{err}</p>}

      {tab === 'search' ? (
        <BookSearch onPick={(book) => setForm({ book })} />
      ) : (
        <>
          <div className="toolbar">
            <input placeholder="문장, 책 제목, 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">최신순</option>
              <option value="old">오래된순</option>
              <option value="book">책 제목순</option>
            </select>
            <button className={'ghost' + (favOnly ? ' on' : '')} onClick={() => setFavOnly(!favOnly)}>★ 즐겨찾기만</button>
          </div>

          <div className="tagbar">
            <button className={'tag' + (!tag ? ' on' : '')} onClick={() => setTag('')}>전체</button>
            {tagCounts.map(([t, n]) => (
              <button key={t} className={'tag' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? '' : t)}>
                #{t} <small>{n}</small>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="empty">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="empty">
              {quotes.length === 0 ? (
                <>아직 모은 문장이 없어요. <button className="link" onClick={() => setTab('search')}>책을 검색해서 첫 문장을 추가해 보세요.</button></>
              ) : '조건에 맞는 문장이 없어요.'}
            </p>
          ) : (
            <div className="list">
              {shown.map((x) => (
                <article key={x.id} className="card">
                  <blockquote><mark>{x.content}</mark></blockquote>
                  <div className="meta">
                    {x.book_thumbnail && <img src={x.book_thumbnail} alt="" />}
                    <div>
                      <b>{x.book_title}</b>
                      <span>{x.book_authors}{x.page ? ` · ${x.page}쪽` : ''}</span>
                    </div>
                  </div>
                  {x.memo && <p className="memo">{x.memo}</p>}
                  <div className="tags">
                    {x.tags.map((t) => (
                      <button key={t} className="tag" onClick={() => setTag(t)}>#{t}</button>
                    ))}
                  </div>
                  <div className="acts">
                    <button onClick={() => toggleFav(x)} aria-label="즐겨찾기">{x.is_favorite ? '★' : '☆'}</button>
                    <button onClick={() => setForm({ quote: x })}>수정</button>
                    <button onClick={() => remove(x.id)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {form && (
        <QuoteForm book={form.book} quote={form.quote} onSave={save} onClose={() => setForm(null)} />
      )}
    </div>
  );
}

function BookSearch({ onPick }) {
  const [text, setText] = useState('');
  const [books, setBooks] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try { setBooks(await searchBooks(text.trim())); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  return (
    <div>
      <form className="toolbar" onSubmit={run}>
        <input placeholder="책 제목이나 저자를 입력하세요" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary" disabled={busy}>{busy ? '검색 중…' : '검색'}</button>
      </form>
      {err && <p className="err">{err}</p>}
      {books && books.length === 0 && <p className="empty">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>}
      <div className="books">
        {(books || []).map((b) => (
          <div key={b.book_id} className="book">
            {b.book_thumbnail ? <img src={b.book_thumbnail} alt="" /> : <div className="noimg">표지 없음</div>}
            <b>{b.book_title}</b>
            <span>{b.book_authors || '저자 정보 없음'}</span>
            <small>{b.published}</small>
            <button className="primary" onClick={() => onPick(b)}>문장 추가</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteForm({ book, quote, onSave, onClose }) {
  const b = quote || book;
  const [content, setContent] = useState(quote?.content || '');
  const [page, setPage] = useState(quote?.page ?? '');
  const [memo, setMemo] = useState(quote?.memo || '');
  const [tags, setTags] = useState((quote?.tags || []).map((t) => '#' + t).join(' '));
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const payload = {
      content: content.trim(),
      page: page === '' ? null : Number(page),
      memo: memo.trim() || null,
      tags: parseTags(tags),
    };
    if (!quote) {
      Object.assign(payload, {
        book_id: book.book_id,
        book_title: book.book_title,
        book_authors: book.book_authors,
        book_thumbnail: book.book_thumbnail,
      });
    }
    const ok = await onSave(payload, quote?.id);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="modal" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{quote ? '문장 수정' : '문장 추가'}</h2>
        <p className="sub">{b.book_title}</p>
        <label>마음에 남은 문장
          <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} autoFocus required />
        </label>
        <div className="row">
          <label>쪽수
            <input type="number" min="1" value={page} onChange={(e) => setPage(e.target.value)} />
          </label>
          <label className="grow">해시태그 (띄어쓰기로 구분)
            <input placeholder="#위로 #용기" value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </div>
        <label>내 생각 (선택)
          <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
        <div className="row end">
          <button type="button" className="ghost" onClick={onClose}>취소</button>
          <button className="primary" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </div>
  );
}
