import { defineConfig } from "drizzle-kit";
import { getDbEnv } from "./src/env";

const dbEnv = getDbEnv();

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbEnv.DATABASE_URL,
  },
  out: "./drizzle",
});
