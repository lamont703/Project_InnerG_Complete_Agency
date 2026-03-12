/**
 * vitest.config.ts
 * Inner G Complete Agency — Vitest Configuration for Frontend Testing
 */

import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        include: ["features/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
        exclude: ["node_modules", ".next", "supabase"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["features/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
            exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"]
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./")
        }
    }
})
