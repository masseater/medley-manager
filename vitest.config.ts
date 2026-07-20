import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // テストはインメモリDB。ファイルごとに別プロセスなのでDBも独立する
    env: { MEDLEY_DB: ":memory:" },
  },
});
