import { BookOpenCheck, CalendarClock, GraduationCap, LockKeyhole, School, ShieldCheck } from "lucide-react";
import { requireStudent } from "@/lib/auth";

export const metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const user = await requireStudent();
  if (!user) return null;

  const details = [
    { icon: School, label: "소속 학교", value: user.schoolName },
    { icon: GraduationCap, label: "공식 학년", value: `${user.officialGrade}학년` },
    { icon: BookOpenCheck, label: "현재 학습 학년", value: `${user.learningGrade}학년` },
    { icon: CalendarClock, label: "일일 질문 한도", value: "20회" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-7 lg:px-10 lg:py-14">
      <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><ShieldCheck size={16} /> 나만의 학습 공간</p>
      <h1 className="font-learning mt-3 text-[2.2rem] font-bold tracking-[-0.045em]">내 정보와 학습 원칙</h1>
      <p className="mt-3 max-w-xl text-[.94rem] leading-7 text-ink-3">학교에서 받은 기본 정보와 LearnCraft가 학습 데이터를 다루는 방식을 확인할 수 있어요.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
        <section>
          <div className="flex items-center gap-4 border-b border-line pb-6">
            <span className="font-learning grid size-15 place-items-center rounded-[16px] border border-line bg-brand-soft text-xl font-bold text-brand-dark shadow-[var(--lift-1)]">{user.name.slice(0, 1)}</span>
            <div><h2 className="font-learning text-xl font-bold">{user.name}</h2><p className="mt-1 text-[.86rem] text-ink-4">LearnCraft 학생 계정</p></div>
          </div>
          <dl className="divide-y divide-line">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-4.5">
                <dt className="flex items-center gap-2.5 text-[.9rem] text-ink-3"><Icon size={17} className="text-brand" strokeWidth={1.8} />{label}</dt>
                <dd className="text-right text-[.9rem] font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-[16px] border border-line bg-brand-page p-6 sm:p-8">
          <LockKeyhole size={22} className="text-brand" strokeWidth={1.8} />
          <h2 className="font-learning mt-5 text-xl font-bold">내 대화는 나에게만</h2>
          <p className="font-learning mt-3 text-[1rem] leading-8 text-ink-2">일반 질문과 AI 답변은 서버에 저장하지 않습니다. 직접 고른 답변만 오답 노트에 남고, 관리자와 교사는 그 내용을 볼 수 없어요.</p>
          <div className="mt-7 border-t border-line pt-5">
            <p className="text-[.82rem] font-bold text-brand">운영을 위해 저장되는 최소 정보</p>
            <ul className="mt-3 grid gap-2.5 text-[.88rem] text-ink-3">
              <li>단원별 AI 사용 횟수</li>
              <li>모델 토큰과 예상 비용</li>
              <li>내가 직접 선택한 북마크 답변</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
