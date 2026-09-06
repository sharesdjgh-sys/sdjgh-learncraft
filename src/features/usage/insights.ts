export type UsagePeriod = 7 | 30;

export type UsageActivity = {
  date: string;
  courseId: string;
  courseTitle: string;
  subjectTitle: string;
  count: number;
};

export function periodDates(today: string, days: UsagePeriod) {
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - days + index + 1);
    return date.toISOString().slice(0, 10);
  });
}

export function summarizeUsage(activities: UsageActivity[], dates: string[]) {
  const daily = new Map(dates.map((date) => [date, 0]));
  const courses = new Map<string, { id: string; title: string; subjectTitle: string; count: number }>();
  for (const activity of activities) {
    if (!daily.has(activity.date)) continue;
    daily.set(activity.date, daily.get(activity.date)! + activity.count);
    const course = courses.get(activity.courseId) ?? {
      id: activity.courseId,
      title: activity.courseTitle,
      subjectTitle: activity.subjectTitle,
      count: 0,
    };
    course.count += activity.count;
    courses.set(activity.courseId, course);
  }
  const byCourse = [...courses.values()].filter((course) => course.count > 0)
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
  const dailyTrend = [...daily].map(([date, count]) => ({ date, count }));
  const total = dailyTrend.reduce((sum, day) => sum + day.count, 0);
  return {
    total,
    activeDays: dailyTrend.filter((day) => day.count > 0).length,
    courseCount: byCourse.length,
    dailyTrend,
    byCourse,
  };
}

export type StudentUsageInsights = {
  days: UsagePeriod;
  date: string;
  timeZone: string;
  usage: { count: number; completed: number; limit: number; remaining: number };
  history: ReturnType<typeof summarizeUsage>;
};
