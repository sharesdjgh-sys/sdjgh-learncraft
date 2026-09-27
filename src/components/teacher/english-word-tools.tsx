"use client";

import { useEffect, useState } from "react";
import { BookMarked, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORD_FILL_MAX, type WordFillItem } from "@/features/english/word-fill";
import type { WordEntry } from "@/features/english/wordlist";
import { readJson } from "./art-works-shared";
import { AiStatus, useAiRequest } from "./ai-request";
import { Card, Toggle } from "./tool-panel";
import { fieldClass } from "./science-lab-shared";

/* 영어 단어 시험지·독해 학습지가 함께 쓰는 단어 도구: AI로 빈 뜻·예문 채우기, 교과 Lesson 어휘 불러오기 */

const key = (word: string) => word.trim().toLowerCase().replace(/’/g, "'");

/** 단어를 WORD_FILL_MAX개씩 나눠 뜻·예문을 받아옵니다. */
export async function requestWordFill(words: string[], options: { meaning: boolean; example: boolean; context?: string }, signal: AbortSignal) {
  const items: WordFillItem[] = [];
  let rejected = 0;
  for (let start = 0; start < words.length; start += WORD_FILL_MAX) {
    const data = await readJson<{ items: WordFillItem[]; rejected: number }>(await fetch("/api/teacher/english-words", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ words: words.slice(start, start + WORD_FILL_MAX), ...options }),
    }));
    items.push(...data.items);
    rejected += data.rejected;
  }
  return { items, rejected };
}

/** 단어 목록의 빈 뜻·예문을 AI로 채웁니다. 교사가 적은 칸은 그대로 둡니다. */
export function WordFillCard({ entries, onChange }: { entries: WordEntry[]; onChange: (update: (entries: WordEntry[]) => WordEntry[]) => void }) {
  const [meaning, setMeaning] = useState(true);
  const [example, setExample] = useState(true);
  const { busy, message, error, run, cancel } = useAiRequest();
  const needs = (entry: WordEntry) => /^[A-Za-z][A-Za-z'’ .-]*$/.test(entry.word.trim()) && ((meaning && !entry.meaning.trim()) || (example && !entry.example.trim()));
  const targets = [...new Set(entries.filter(needs).map(entry => entry.word.trim()))];
  const fill = () => run(async signal => {
    const { items, rejected } = await requestWordFill(targets, { meaning, example }, signal);
    const found = new Map(items.map(item => [key(item.word), item]));
    const filled = items.filter(item => item.meaning || item.example).length;
    // 기다리는 동안 교사가 적은 칸은 덮어쓰지 않도록 최신 목록에 합칩니다.
    onChange(current => current.map(entry => {
      const item = found.get(key(entry.word));
      return item ? { ...entry, meaning: entry.meaning.trim() ? entry.meaning : item.meaning, example: entry.example.trim() ? entry.example : item.example } : entry;
    }));
    return `단어 ${filled}개의 빈 칸을 채웠어요.${rejected ? ` 조건에 맞지 않는 결과 ${rejected}개는 버렸어요.` : ""} 시험에 내기 전에 뜻과 예문을 한 번 확인해 주세요.`;
  });
  return (
    <Card title="AI로 빈 칸 채우기" help="뜻이나 예문이 빈 단어만 Gemini로 채워요. 이미 적은 뜻·예문은 바꾸지 않아요. 예문은 그 단어가 들어 있는지 검사하고, 맞지 않으면 버려요.">
      <div className="grid grid-cols-2 gap-x-2">
        <Toggle label="우리말 뜻" checked={meaning} onChange={setMeaning} />
        <Toggle label="예문" checked={example} onChange={setExample} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button size="sm" disabled={busy || !targets.length || (!meaning && !example)} onClick={() => void fill()}>
          {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {busy ? "채우는 중…" : targets.length ? `빈 칸 채우기 (${targets.length}개)` : "채울 칸이 없어요"}
        </Button>
        {busy && <Button variant="ghost" size="sm" onClick={cancel}>멈추기</Button>}
      </div>
      <AiStatus message={message} error={error} />
    </Card>
  );
}

type Course = { code: string; title: string };
type Lesson = { id: string; title: string; terms: { term: string }[] };
const vocabularyEndpoint = "/api/teacher/english-vocabulary";

/** 학교에 공개된 영어 과목의 Lesson 어휘를 단어 목록에 더합니다(어원 카드와 같은 자료). */
export function CourseWordsCard({ entries, onChange, limit = 80 }: { entries: WordEntry[]; onChange: (update: (entries: WordEntry[]) => WordEntry[]) => void; limit?: number }) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [course, setCourse] = useState("");
  // 불러온 Lesson은 과목 코드와 함께 두어, 과목을 바꾸면 새 목록이 올 때까지 ‘불러오는 중’으로 보입니다.
  const [loaded, setLoaded] = useState<{ course: string; lessons: Lesson[] } | null>(null);
  const lessons = loaded?.course === course ? loaded.lessons : null;
  const [lessonId, setLessonId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open || courses) return;
    let alive = true;
    fetch(vocabularyEndpoint).then(readJson<{ courses: Course[] }>).then(data => {
      if (!alive) return;
      setCourses(data.courses);
      setCourse(data.courses[0]?.code ?? "");
    }).catch(reason => alive && setError(reason instanceof Error ? reason.message : "영어 과목을 불러오지 못했습니다."));
    return () => { alive = false; };
  }, [open, courses]);
  useEffect(() => {
    if (!course) return;
    let alive = true;
    fetch(`${vocabularyEndpoint}?course=${encodeURIComponent(course)}`).then(readJson<{ lessons: Lesson[] }>).then(data => {
      if (!alive) return;
      setLoaded({ course, lessons: data.lessons });
      setLessonId(data.lessons[0]?.id ?? "");
    }).catch(reason => alive && setError(reason instanceof Error ? reason.message : "Lesson을 불러오지 못했습니다."));
    return () => { alive = false; };
  }, [course]);
  const lesson = lessons?.find(item => item.id === lessonId);
  const have = new Set(entries.map(entry => key(entry.word)));
  const fresh = lesson ? [...new Set(lesson.terms.map(item => item.term.trim()).filter(term => term && !have.has(key(term))))] : [];
  function add() {
    const room = Math.max(0, limit - entries.filter(entry => entry.word.trim()).length);
    const words = fresh.slice(0, room);
    // 비어 있는 줄은 정리하고 새 단어를 뒤에 붙입니다.
    onChange(current => [...current.filter(entry => entry.word.trim()), ...words.map(word => ({ word, meaning: "", example: "" }))]);
    setMessage(`${lesson?.title ?? "Lesson"} 어휘 ${words.length}개를 더했어요.${fresh.length > words.length ? ` 목록이 ${limit}개까지라 ${fresh.length - words.length}개는 넣지 못했어요.` : ""} 뜻·예문은 ‘AI로 빈 칸 채우기’나 표에서 채워 주세요.`);
  }
  return (
    <Card title="교과 어휘 불러오기" help="학교에 공개된 영어 과목의 Lesson 어휘(어원 카드와 같은 자료)를 목록 뒤에 더해요. 이미 있는 단어는 건너뛰어요.">
      {!open ? <Button variant="secondary" size="sm" onClick={() => setOpen(true)}><BookMarked size={14} /> 과목·Lesson 고르기</Button> : <div className="space-y-2">
        {courses === null && !error && <p className="flex items-center gap-2 text-xs text-ink-4"><LoaderCircle size={14} className="animate-spin" /> 영어 과목을 불러오는 중…</p>}
        {courses?.length === 0 && <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-3">학교에 공개된 영어 과목이 없어요. 단어를 직접 붙여 넣어 주세요.</p>}
        {!!courses?.length && <>
          <select aria-label="영어 과목" value={course} onChange={event => setCourse(event.target.value)} className={fieldClass}>
            {courses.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}
          </select>
          <select aria-label="Lesson" value={lessonId} disabled={!lessons?.length} onChange={event => setLessonId(event.target.value)} className={fieldClass}>
            {lessons === null ? <option>Lesson을 불러오는 중…</option> : lessons.map(item => <option key={item.id} value={item.id}>{item.title} ({item.terms.length}개)</option>)}
          </select>
          {lesson && <p className="text-[.72rem] leading-5 text-ink-4">{lesson.terms.length ? `새 단어 ${fresh.length}개: ${fresh.slice(0, 8).join(", ")}${fresh.length > 8 ? " …" : ""}` : "정리된 어휘가 없어요."}</p>}
          <Button size="sm" disabled={!fresh.length} onClick={add}>목록에 더하기 ({fresh.length}개)</Button>
        </>}
        {message && <p role="status" className="text-[.74rem] leading-5 text-ink-3">{message}</p>}
        {error && <p role="alert" className="text-[.74rem] font-semibold text-danger">{error}</p>}
      </div>}
    </Card>
  );
}
