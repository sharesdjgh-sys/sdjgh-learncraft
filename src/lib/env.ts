import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional().or(z.literal("")),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_DEV_LOGIN_ENABLED: z.enum(["true", "false"]).default("true"),
  AUTH_ADMIN_ID: z.string().min(1).optional(),
  AUTH_ADMIN_PASSWORD: z.string().min(4).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_ID: z.string().default("gemini-3.6-flash"),
  APP_TIMEZONE: z.string().default("Asia/Seoul"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_DEV_LOGIN_ENABLED: process.env.AUTH_DEV_LOGIN_ENABLED,
  AUTH_ADMIN_ID: process.env.AUTH_ADMIN_ID,
  AUTH_ADMIN_PASSWORD: process.env.AUTH_ADMIN_PASSWORD,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL_ID: process.env.GEMINI_MODEL_ID,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
});

if (!parsed.success) {
  throw new Error(`환경 변수 설정 오류: ${parsed.error.message}`);
}

export const env = parsed.data;

export const isDatabaseConfigured = Boolean(env.DATABASE_URL);
export const isGeminiConfigured = Boolean(env.GEMINI_API_KEY);
