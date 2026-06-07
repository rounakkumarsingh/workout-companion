import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/drizzle-schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
