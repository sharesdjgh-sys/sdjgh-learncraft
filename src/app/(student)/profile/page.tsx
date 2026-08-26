import { BookOpenCheck, CalendarClock, GraduationCap, LockKeyhole, School, ShieldCheck } from "lucide-react";
import { requireStudent } from "@/lib/auth";

export const metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const user = await requireStudent();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
      <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-brand uppercase"><ShieldCheck size={16} /> Private learning space</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">내 정보</h1>
      <p className="mt-2 text-sm text-ink-soft">학교에서 받은 기본 정보와 LearnCraft 이용 원칙을 확인할 수 있어요.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.05fr_.95fr]">
        <section className="elevated-card p-6 sm:p-7">
          <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-brand text-xl font-black text-white">{user.name.slice(0, 1)}</span><div><h2 className="text-xl font-extrabold">{user.name}</h2><p className="mt-1 text-sm text-ink-soft">LearnCraft 학생 계정</p></div></div>
          <dl className="mt-7 divide-y divide-line">
            {[{ icon: School, label: "소속 학교", value: user.schoolName }, { icon: GraduationCap, label: "공식 학년", value: `${user.officialGrade}학년` }, { icon: BookOpenCheck, label: "현재 학습 학년", value: `${user.learningGrade}학년` }, { icon: CalendarClock, label: "일일 질문 한도", value: "20회" }].map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center justify-between py-4"><dt className="flex items-center gap-2 text-sm text-ink-soft"><Icon size={17} />{label}</dt><dd className="text-sm font-bold text-ink">{value}</dd></div>)}
          </dl>
        </section>
        <section className="surface-card p-6 sm:p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><LockKeyhole size={21} /></span>
          <h2 className="mt-4 text-lg font-extrabold">내 대화는 나에게만</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">일반 질문과 AI 답변은 서버에 저장하지 않습니다. 오답 노트에 직접 북마크한 답변만 저장되며 관리자와 교사는 내용을 볼 수 없습니다.</p>
          <div className="mt-6 rounded-2xl bg-surface-muted p-4"><p className="text-xs font-bold text-brand">저장되는 학습 정보</p><ul className="mt-2 grid gap-2 text-sm text-ink-soft"><li>단원별 AI 사용 횟수</li><li>모델 토큰과 예상 비용</li><li>직접 선택한 북마크 답변</li></ul></div>
        </section>
      </div>
    </div>
  );
}
