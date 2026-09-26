import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // 브라우저 기본 창(alert·confirm·prompt) 대신 src/components/ui/confirm-dialog.tsx의 useConfirm()을 씁니다.
    rules: {
      "no-alert": "error",
    },
  },
  {
    files: ["src/components/feedback/feedback-board.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
]);
