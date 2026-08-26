import { drizzle } from "drizzle-orm/neon-http";
import { env, isDatabaseConfigured } from "@/lib/env";
import * as schema from "./schema";

export const db = isDatabaseConfigured
  ? drizzle(env.DATABASE_URL!, { schema })
  : null;
