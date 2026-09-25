"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpenText, BookmarkCheck, Brush, BookmarkPlus, Columns2, Copy, Library, Lightbulb, LoaderCircle, Lock, Palette, Presentation, Printer, Search, ShieldCheck, Sparkles, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommonsImage } from "@/lib/commons-media";
import { artGroups, artMovements, artTerms, artWorks, findTerm, findWork, termCategories, termDetails, worksForTerm, type ArtTerm, type CatalogWork, type TermCategory } from "@/lib/art-works/catalog";
import type { TermExplanation } from "@/lib/art-works/explanation";
import { ArtImage, ArtWorkDialog, catalogItem, collectionStore, commonsItem, copyText, creditText, endpoint, ExplanationPanel, readJson, rememberImages, TermExplanationCard, toggleCollection, useArtImages, useCollection, useExplanation, type ArtItem } from "./art-works-shared";
import { ArtSlideshow, ArtWorksheet } from "./art-works-show";

type Tab = "movements" | "terms" | "search" | "collection";
type Opened = { item: ArtItem; work?: CatalogWork };

const searchSuggestions = [
  { label: "모네", query: "Claude Monet painting" },
  { label: "고흐", query: "Vincent van Gogh painting" },
  { label: "렘브란트", query: "Rembrandt painting" },
  { label: "클림트", query: "Gustav Klimt painting" },
  { label: "칸딘스키", query: "Wassily Kandinsky" },
  { label: "호쿠사이", query: "Hokusai ukiyo-e" },
  { label: "김홍도", query: "Kim Hong-do Danwon" },
  { label: "신사임당", query: "Shin Saimdang" },
  { label: "민화", query: "Korean folk painting minhwa" },
  { label: "고려청자", query: "Goryeo celadon" },
];

function SaveButton({ item, className }: { item: ArtItem; className?: string }) {
  const saved = useCollection().some(entry => entry.key === item.key);
  return (
    <button type="button" onClick={event => { event.stopPropagation(); toggleCollection(item); }} aria-pressed={saved} aria-label={saved ? `${item.title} 자료함에서 빼기` : `${item.title} 자료함에 담기`} title={saved ? "자료함에서 빼기" : "수업 자료함에 담기"}
      className={cn("grid size-9 place-items-center rounded-full border shadow-sm transition-colors", saved ? "border-brand/30 bg-brand text-white" : "border-line bg-white/95 text-ink-3 hover:border-brand/30 hover:text-brand-dark", className)}>
      {saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
    </button>
  );
}

function WorkCard({ item, image, onOpen }: { item: ArtItem; image: CommonsImage | null | undefined; onOpen: () => void }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--lift-1)] transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_12px_28px_rgba(65,55,120,.12)]">
      <button type="button" onClick={onOpen} className="block w-full text-left focus-visible:outline-2 focus-visible:outline-brand">
        <ArtImage item={item} image={image} className="aspect-[4/3] w-full" />
        <div className="px-4 py-3">
          <h3 className="line-clamp-2 break-keep text-[.95rem] font-bold leading-snug text-ink">{item.title}</h3>
          <p className="mt-1 line-clamp-1 text-[.8rem] text-ink-3">{item.artist}{item.year && ` · ${item.year}`}</p>
        </div>
      </button>
      <SaveButton item={item} className="absolute right-2.5 top-2.5" />
      {item.copyright && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#7a6d5c] px-2 py-1 text-[.68rem] font-bold text-white"><Lock size={11} /> 설명만</span>}
    </article>
  );
}

function MovementsPanel({ onOpen }: { onOpen: (opened: Opened) => void }) {
  const [movementId, setMovementId] = useState(artMovements[0].id);
  const [query, setQuery] = useState("");
  const movement = artMovements.find(item => item.id === movementId) ?? artMovements[0];
  const needle = query.trim().toLowerCase();
  // 찾는 말이 있으면 모든 사조에서 제목·원제·작가·연도로 작품을 찾습니다.
  const found = needle ? artWorks.filter(work => `${work.title} ${work.original ?? ""} ${work.artist} ${work.year}`.toLowerCase().includes(needle)) : null;
  const shown = found ?? movement.works.map(work => findWork(work.id)!);
  const getImage = useArtImages(shown.slice(0, 48).map(work => work.file));
  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
      <nav aria-label="시대와 사조" className="rounded-[18px] border border-line bg-surface p-3 shadow-[var(--lift-1)] lg:sticky lg:top-24">
        <label className="mb-3 flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
          <Search size={15} className="text-ink-4" aria-hidden="true" />
          <input value={query} onChange={event => setQuery(event.target.value)} maxLength={40} placeholder="작품·작가 찾기 (예: 고흐)" aria-label="작품이나 작가 이름 찾기" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-4" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="text-ink-4 hover:text-ink-2"><X size={15} /></button>}
        </label>
        <div className="scrollbar-subtle flex gap-4 overflow-x-auto lg:block lg:max-h-[calc(100vh-210px)] lg:space-y-3 lg:overflow-y-auto">
          {artGroups.map(group => (
            <div key={group} className="shrink-0">
              <p className="px-2 pb-1 text-[.7rem] font-extrabold uppercase tracking-wide text-ink-4">{group}</p>
              <div className="flex gap-1 lg:flex-col">
                {artMovements.filter(item => item.group === group).map(item => (
                  <button key={item.id} type="button" aria-pressed={!found && item.id === movement.id} onClick={() => { setMovementId(item.id); setQuery(""); }}
                    className={cn("flex min-h-10 shrink-0 flex-col items-start justify-center rounded-xl px-3 py-1.5 text-left transition-colors", !found && item.id === movement.id ? "bg-brand-soft text-brand-dark" : "text-ink-2 hover:bg-surface-2")}>
                    <span className="whitespace-nowrap text-[.86rem] font-bold">{item.name} <span className="text-[.7rem] font-semibold text-ink-4">{item.works.length}</span></span>
                    <span className="hidden text-[.7rem] text-ink-4 lg:block">{item.period}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0">
        {found ? (
          <header className="rounded-[18px] border border-line bg-surface p-5 shadow-[var(--lift-1)]">
            <h2 className="text-[1.3rem] font-extrabold text-ink">‘{query.trim()}’ 찾은 작품 {found.length}점</h2>
            <p className="mt-1 text-[.84rem] text-ink-3">{found.length ? "여러 사조에 걸쳐 찾았어요. 사조를 누르면 다시 사조별로 볼 수 있어요." : "정리된 작품에 없어요. ‘작품 찾기’ 탭에서 Wikimedia Commons 전체를 찾아보세요."}</p>
          </header>
        ) : (
          <header className="rounded-[18px] border border-line bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] p-5 shadow-[var(--lift-1)] sm:p-6">
            <p className="text-[.78rem] font-bold text-brand">{movement.group} · {movement.period} · 작품 {movement.works.length}점</p>
            <h2 className="mt-1 text-[1.6rem] font-extrabold tracking-[-0.03em] text-ink">{movement.name} <span className="text-[.95rem] font-semibold text-ink-4">{movement.english}</span></h2>
            <p className="mt-2 max-w-4xl break-keep text-[.92rem] leading-7 text-ink-2">{movement.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {movement.features.map(feature => <li key={feature} className="rounded-full border border-brand/15 bg-surface px-3 py-1 text-[.8rem] font-semibold text-ink-2">{feature}</li>)}
            </ul>
          </header>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.slice(0, 48).map(work => {
            const item = catalogItem(work);
            return <WorkCard key={work.id} item={item} image={getImage(work.file)} onOpen={() => onOpen({ item, work })} />;
          })}
        </div>
        {shown.length > 48 && <p className="mt-3 text-center text-[.8rem] text-ink-4">앞의 48점만 보여 줘요. 찾는 말을 더 자세히 적어 보세요.</p>}
      </div>
    </div>
  );
}

function TermSection({ icon: Icon, title, children }: { icon: typeof Palette; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4 sm:px-6">
      <h3 className="flex items-center gap-2 text-[.8rem] font-extrabold text-ink-3"><Icon size={15} className="text-brand" aria-hidden="true" /> {title}</h3>
      <div className="mt-2 break-keep text-[.93rem] leading-7 text-ink-2">{children}</div>
    </section>
  );
}

function TermDetailView({ term, onSelect, onOpenWork }: { term: ArtTerm; onSelect: (id: string) => void; onOpenWork: (work: CatalogWork) => void }) {
  const detail = termDetails[term.id];
  const allWorks = worksForTerm(term.id);
  const works = allWorks.slice(0, 8);
  const items = works.map(catalogItem);
  const getImage = useArtImages(items.map(item => item.file));
  const explanation = useExplanation<TermExplanation>(`t:${term.id}`, { kind: "term", term: term.term, termId: term.id });
  return (
    <article className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
      <header className="bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-5 py-5 sm:px-6">
        <span className="rounded-full bg-brand px-2.5 py-1 text-[.72rem] font-bold text-white">{term.category}</span>
        <h2 className="mt-3 text-[1.9rem] font-extrabold tracking-[-0.03em] text-ink">{term.term}{term.english && <span className="ml-3 text-[1rem] font-semibold text-ink-4">{term.english}</span>}</h2>
        <p className="mt-2 max-w-4xl break-keep text-[1rem] font-semibold leading-8 text-ink-2">{term.definition}</p>
      </header>
      {detail && <TermSection icon={BookOpenText} title="자세히 알아보기"><p>{detail.detail}</p></TermSection>}
      {term.tip && <TermSection icon={Lightbulb} title="수업 팁"><p>{term.tip}</p></TermSection>}
      {detail && <TermSection icon={Brush} title="수업 활동 아이디어"><p>{detail.activity}</p></TermSection>}
      {items.length > 0 && (
        <TermSection icon={Palette} title={`작품에서 찾아보기 (${allWorks.length}점${allWorks.length > works.length ? ` 가운데 ${works.length}점` : ""})`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((item, index) => (
              <button key={item.key} type="button" onClick={() => onOpenWork(works[index])} className="group overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:border-brand/30 hover:shadow-[var(--lift-1)]">
                <ArtImage item={item} image={getImage(item.file)} className="aspect-[4/3] w-full" />
                <span className="block px-2.5 py-2"><span className="line-clamp-1 text-[.82rem] font-bold text-ink group-hover:text-brand-dark">{item.title}</span><span className="line-clamp-1 text-[.72rem] text-ink-4">{item.artist}</span></span>
              </button>
            ))}
          </div>
        </TermSection>
      )}
      {detail && detail.related.length > 0 && (
        <TermSection icon={Tags} title="함께 보면 좋은 용어">
          <div className="flex flex-wrap gap-1.5">
            {detail.related.map(id => findTerm(id)).filter(item => item !== undefined).map(item => (
              <button key={item.id} type="button" onClick={() => onSelect(item.id)} title={item.definition} className="min-h-9 rounded-lg border border-line bg-surface-2 px-3 text-[.84rem] font-semibold text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark">{item.term}</button>
            ))}
          </div>
        </TermSection>
      )}
      <section className="border-t border-line bg-surface-2 px-5 py-4 sm:px-6">
        <h3 className="mb-3 flex items-center gap-2 text-[.8rem] font-extrabold text-ink-3"><Sparkles size={15} className="text-brand" /> AI로 더 자세히 (쉬운 풀이·작품 예시·체험 활동·헷갈리는 점)</h3>
        <ExplanationPanel state={explanation} label="AI 풀이 만들기" render={value => <TermExplanationCard value={value} />} />
      </section>
    </article>
  );
}

function FreeTermView({ term }: { term: string }) {
  const explanation = useExplanation<TermExplanation>(`t:${term.toLowerCase()}`, { kind: "term", term });
  return (
    <article className="rounded-[18px] border border-dashed border-brand/30 bg-brand-page p-5 sm:p-6">
      <h2 className="text-[1.6rem] font-extrabold text-ink">‘{term}’</h2>
      <p className="mt-1 text-[.9rem] text-ink-3">정리된 용어에 없는 말이에요. AI에게 수업용 풀이를 부탁해 보세요.</p>
      <div className="mt-4"><ExplanationPanel state={explanation} label="AI로 풀이하기" render={value => <TermExplanationCard value={value} />} /></div>
    </article>
  );
}

function TermsPanel({ focusTerm, onOpenWork }: { focusTerm: string | null; onOpenWork: (work: CatalogWork) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TermCategory | "all">("all");
  const [selected, setSelected] = useState<string>(focusTerm ?? artTerms[0].id);
  const [freeTerm, setFreeTerm] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const list = artTerms.filter(term => (category === "all" || term.category === category)
    && (!needle || `${term.term} ${term.english ?? ""} ${term.definition}`.toLowerCase().includes(needle)));
  const exact = artTerms.some(term => term.term.toLowerCase() === needle || term.english?.toLowerCase() === needle);
  const current = findTerm(selected) ?? artTerms[0];
  const groups = termCategories.map(name => ({ name, terms: list.filter(term => term.category === name) })).filter(group => group.terms.length);
  // 좁은 화면에서는 목록 아래에 있는 설명으로 옮겨 갑니다.
  const showDetail = () => { if (window.innerWidth < 1024) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "start" })); };
  function select(id: string) {
    setFreeTerm(null);
    setSelected(id);
    showDetail();
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <aside className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)] lg:sticky lg:top-24">
        <div className="space-y-2.5 border-b border-line bg-surface-2 p-3">
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
            <Search size={15} className="text-ink-4" aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && list[0]) select(list[0].id); }} maxLength={40} placeholder="용어 찾기 (예: 명도, 원근법)" aria-label="미술 용어 찾기" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-4" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="text-ink-4 hover:text-ink-2"><X size={15} /></button>}
          </label>
          <div role="group" aria-label="용어 분류" className="flex flex-wrap gap-1">
            {(["all", ...termCategories] as const).map(value => (
              <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}
                className={cn("min-h-7 rounded-full px-2.5 text-[.74rem] font-bold transition-colors", category === value ? "bg-brand text-white" : "bg-surface text-ink-3 hover:bg-brand-soft hover:text-brand-dark")}>{value === "all" ? "전체" : value}</button>
            ))}
          </div>
        </div>
        <nav aria-label="미술 용어 목록" className="scrollbar-subtle max-h-[45vh] overflow-y-auto p-2 lg:max-h-[calc(100vh-260px)]">
          {groups.map(group => (
            <div key={group.name} className="mb-2">
              <p className="px-2 pb-1 pt-1.5 text-[.7rem] font-extrabold text-ink-4">{group.name} <span className="font-semibold">{group.terms.length}</span></p>
              {group.terms.map(term => {
                const active = !freeTerm && term.id === current.id;
                return (
                  <button key={term.id} type="button" aria-current={active ? "true" : undefined} onClick={() => select(term.id)}
                    className={cn("flex min-h-9 w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors", active ? "bg-brand-soft text-brand-dark" : "text-ink-2 hover:bg-surface-2")}>
                    <span className="text-[.88rem] font-bold">{term.term}</span>
                    {term.english && <span className="truncate text-[.7rem] text-ink-4">{term.english}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {needle && !exact && (
            <button type="button" onClick={() => { setFreeTerm(query.trim()); showDetail(); }}
              className={cn("mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg border border-dashed border-brand/30 px-2.5 text-left text-[.84rem] font-bold text-brand-dark hover:bg-brand-page", freeTerm && "bg-brand-page")}>
              <Sparkles size={14} /> ‘{query.trim()}’ AI로 풀이하기
            </button>
          )}
          {!groups.length && !needle && <p className="p-3 text-center text-sm text-ink-4">이 분류에 정리된 용어가 없어요.</p>}
        </nav>
      </aside>
      <div ref={detailRef} className="min-w-0 scroll-mt-24">
        {freeTerm ? <FreeTermView key={freeTerm.toLowerCase()} term={freeTerm} /> : <TermDetailView key={current.id} term={current} onSelect={select} onOpenWork={onOpenWork} />}
      </div>
    </div>
  );
}

function SearchPanel({ onOpen }: { onOpen: (opened: Opened) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommonsImage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search(text: string) {
    const q = text.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setError("");
    try {
      const data = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`).then(readJson<{ images: CommonsImage[] }>);
      rememberImages(data.images);
      setResults(data.images);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "작품을 찾지 못했어요.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <form onSubmit={event => { event.preventDefault(); void search(query); }} className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-1.5 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
          <Search size={17} className="ml-2 text-ink-4" aria-hidden="true" />
          <input value={query} onChange={event => setQuery(event.target.value)} maxLength={120} placeholder="작가나 작품 이름 (영어로 찾으면 더 잘 나와요. 예: Monet Water Lilies)" aria-label="작품 검색어" className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink-4" />
          <Button type="submit" size="sm" disabled={!query.trim() || loading}>{loading ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />} 찾기</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[.74rem] font-bold text-ink-4">빠른 찾기</span>
          {searchSuggestions.map(item => <button key={item.label} type="button" onClick={() => void search(item.query)} className="min-h-8 rounded-full border border-line bg-surface px-3 text-[.78rem] font-semibold text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark">{item.label}</button>)}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[.76rem] leading-5 text-ink-4"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Wikimedia Commons에서 퍼블릭 도메인이거나 CC 이용 허락이 확인된 이미지만 보여 줘요. 수업 자료에 쓸 때는 ‘출처 복사’로 출처를 함께 적어 주세요.</p>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl border border-danger/15 bg-[var(--danger-page)] px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {results && !results.length && !loading && <p className="mt-6 text-center text-sm text-ink-3">‘{query}’(으)로 쓸 수 있는 이미지를 찾지 못했어요. 영어 이름으로 다시 찾아보세요.</p>}
      {results && results.length > 0 && (
        <div className={cn("mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", loading && "opacity-50")}>
          {results.map(image => { const item = commonsItem(image); return <WorkCard key={image.file} item={item} image={image} onOpen={() => onOpen({ item })} />; })}
        </div>
      )}
    </div>
  );
}

function CollectionPanel({ onOpen, onShow }: { onOpen: (item: ArtItem) => void; onShow: (pair: boolean, start?: number) => void }) {
  const items = useCollection();
  const getImage = useArtImages(items.map(item => item.file));
  const [sheetTitle, setSheetTitle] = useState("작품 감상 활동지");
  const [copied, setCopied] = useState(false);
  function move(index: number, delta: number) {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    collectionStore.write(next);
  }
  if (!items.length) {
    return <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-sm text-ink-3">
      <Library size={26} className="text-brand" />
      <p className="font-bold text-ink-2">수업 자료함이 비어 있어요.</p>
      <p className="break-keep">작품 카드의 <BookmarkPlus size={14} className="inline" /> 단추로 수업에 쓸 작품을 담으면 슬라이드로 보여 주거나 감상 활동지로 인쇄할 수 있어요.</p>
    </div>;
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 shadow-[var(--lift-1)]">
            <span className="w-6 text-center text-[.8rem] font-extrabold tabular-nums text-ink-4">{index + 1}</span>
            <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <ArtImage item={item} image={getImage(item.file)} className="size-16 shrink-0 overflow-hidden rounded-xl" />
              <span className="min-w-0">
                <span className="line-clamp-1 font-bold text-ink">{item.title}</span>
                <span className="line-clamp-1 text-[.8rem] text-ink-3">{item.artist}{item.year && ` · ${item.year}`}</span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => onShow(false, index)} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-brand-page hover:text-brand-dark" aria-label={`${item.title}부터 슬라이드 보기`} title="여기서부터 슬라이드"><Presentation size={16} /></button>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 disabled:opacity-25" aria-label="위로"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 disabled:opacity-25" aria-label="아래로"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => toggleCollection(item)} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-[var(--danger-page)] hover:text-danger" aria-label={`${item.title} 빼기`}><X size={16} /></button>
            </div>
          </li>
        ))}
      </ol>
      <aside className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)] lg:sticky lg:top-24">
        <p className="text-sm font-extrabold text-ink">수업에서 쓰기</p>
        <Button className="w-full" onClick={() => onShow(false)}><Presentation size={16} /> 슬라이드로 보기</Button>
        <Button className="w-full" variant="secondary" disabled={items.length < 2} onClick={() => onShow(true)}><Columns2 size={16} /> 두 작품 나란히 비교</Button>
        <p className="text-[.74rem] leading-5 text-ink-4">← → 넘기기 · C 작품 정보 가리기(작품 맞히기) · F 전체 화면</p>
        <div className="border-t border-line pt-3">
          <label htmlFor="art-sheet-title" className="text-[.8rem] font-bold text-ink-2">감상 활동지 제목</label>
          <input id="art-sheet-title" value={sheetTitle} onChange={event => setSheetTitle(event.target.value)} maxLength={40} className="mt-1.5 min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus-visible:border-brand/50" />
          <Button className="mt-2 w-full" variant="secondary" onClick={() => window.print()}><Printer size={15} /> 감상 활동지 인쇄</Button>
          <p className="mt-1.5 text-[.74rem] leading-5 text-ink-4">작품마다 A4 한 장에 이미지와 펠드먼 4단계 질문이 실려요. AI 해설을 만든 작품은 해설의 질문을 씁니다.</p>
        </div>
        <div className="flex gap-2 border-t border-line pt-3">
          <Button className="flex-1" variant="secondary" size="sm" onClick={() => void copyText(items.map((item, index) => `${index + 1}. ${creditText(item, getImage(item.file))}`).join("\n")).then(ok => { setCopied(ok); setTimeout(() => setCopied(false), 1600); })}><Copy size={14} /> {copied ? "복사했어요" : "출처 목록 복사"}</Button>
          <Button variant="ghost" size="sm" onClick={() => { if (window.confirm("수업 자료함을 모두 비울까요?")) collectionStore.write([]); }}><Trash2 size={14} /> 비우기</Button>
        </div>
      </aside>
      <ArtWorksheet items={items} title={sheetTitle} />
    </div>
  );
}

export function ArtWorksLab() {
  const [tab, setTab] = useState<Tab>("movements");
  const [opened, setOpened] = useState<Opened | null>(null);
  const [focusTerm, setFocusTerm] = useState<string | null>(null);
  const [show, setShow] = useState<{ pair: boolean; start: number } | null>(null);
  const collection = useCollection();
  const tabs = useMemo(() => [
    { id: "movements" as const, label: "시대·사조별 작품", icon: Palette },
    { id: "terms" as const, label: "미술 용어", icon: Tags },
    { id: "search" as const, label: "작품 찾기", icon: Search },
    { id: "collection" as const, label: `수업 자료함${collection.length ? ` ${collection.length}` : ""}`, icon: Library },
  ], [collection.length]);

  const closeDialog = useCallback(() => setOpened(null), []);
  const closeShow = useCallback(() => setShow(null), []);
  const openWork = (work: CatalogWork) => setOpened({ item: catalogItem(work), work });
  function openTerm(termId: string) {
    setOpened(null);
    setTab("terms");
    setFocusTerm(termId);
  }
  function openItem(item: ArtItem) {
    const work = item.workId ? findWork(item.workId) : undefined;
    setOpened(work ? { item: catalogItem(work), work } : { item });
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Palette size={16} /> 교사 지원실 · 미술</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">수업용 미술 작품</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">교과서에서 다루는 시대·사조별 대표 작품과 미술 용어를 모았어요. 작품을 골라 AI 해설과 감상 발문을 만들고, 자료함에 담아 슬라이드로 보여 주거나 감상 활동지로 인쇄하세요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>

      <div role="tablist" aria-label="미술 작품 메뉴" className="scrollbar-subtle mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-[var(--lift-1)] sm:w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[.86rem] font-bold transition-colors", tab === id ? "bg-brand text-white shadow-sm" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* 탭마다 높이가 달라 스크롤바가 생겼다 사라지며 화면이 흔들리지 않도록 늘 화면보다 길게 둡니다. */}
      <section className="mt-5 min-h-screen" role="tabpanel">
        {tab === "movements" && <MovementsPanel onOpen={setOpened} />}
        {tab === "terms" && <TermsPanel key={focusTerm ?? "all"} focusTerm={focusTerm} onOpenWork={openWork} />}
        {tab === "search" && <SearchPanel onOpen={setOpened} />}
        {tab === "collection" && <CollectionPanel onOpen={openItem} onShow={(pair, start = 0) => setShow({ pair, start })} />}
      </section>

      {opened && <ArtWorkDialog key={opened.item.key} item={opened.item} point={opened.work?.point} place={opened.work?.place} medium={opened.work?.medium} terms={opened.work?.terms} onClose={closeDialog} onOpenTerm={openTerm} />}
      {show && <ArtSlideshow items={collection} pair={show.pair} start={show.start} onClose={closeShow} />}
    </div>
  );
}
