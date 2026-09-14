import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

const CACHE_VERSION = "curriculum-v1";

export function schoolCurriculumCacheTag(schoolId: string) {
  return `curriculum:${schoolId}`;
}

export function cachedCurriculumData<T>(
  schoolId: string,
  keyParts: string[],
  loader: () => Promise<T>,
) {
  return unstable_cache(loader, [CACHE_VERSION, schoolId, ...keyParts], {
    tags: [schoolCurriculumCacheTag(schoolId)],
    revalidate: 3600,
  })();
}

export function invalidateSchoolCurriculumCache(schoolId: string) {
  revalidateTag(schoolCurriculumCacheTag(schoolId), { expire: 0 });
}
