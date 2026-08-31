import type { SessionUser } from "@/types";

const SCHOOL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SCHOOL_NAME = "서대전여자고등학교";

export type SampleStudentAccount = {
  loginId: string;
  initialPassword: string;
  user: SessionUser;
};

export const sampleStudentAccounts: SampleStudentAccount[] = [
  {
    loginId: "10501",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      externalId: "10501",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "김하늘",
      role: "STUDENT",
      officialGrade: 1,
      learningGrade: 1,
    },
  },
  {
    loginId: "10502",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111112",
      externalId: "10502",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "이도윤",
      role: "STUDENT",
      officialGrade: 1,
      learningGrade: 1,
    },
  },
  {
    loginId: "10503",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111113",
      externalId: "10503",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "박서아",
      role: "STUDENT",
      officialGrade: 1,
      learningGrade: 1,
    },
  },
  {
    loginId: "20301",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111114",
      externalId: "20301",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "최민준",
      role: "STUDENT",
      officialGrade: 2,
      learningGrade: 2,
    },
  },
  {
    loginId: "20302",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111115",
      externalId: "20302",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "정지우",
      role: "STUDENT",
      officialGrade: 2,
      learningGrade: 2,
    },
  },
  {
    loginId: "31201",
    initialPassword: "student^^",
    user: {
      id: "11111111-1111-4111-8111-111111111116",
      externalId: "31201",
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      name: "한유진",
      role: "STUDENT",
      officialGrade: 3,
      learningGrade: 3,
    },
  },
];
