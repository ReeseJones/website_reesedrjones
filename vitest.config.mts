import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

/**
 * Custom Vite plugin to emulate Parcel 2 asset import behaviors:
 * 1. Shaders (.vert, .frag, .glsl) export raw GLSL string content.
 * 2. Prefixes like "bundle-text:" and "url:" resolve cleanly to underlying files.
 */
function parcelCompatibilityPlugin() {
    return {
        name: "parcel-compatibility-plugin",
        resolveId(source: string, importer: string | undefined) {
            if (source.startsWith("bundle-text:") || source.startsWith("url:")) {
                const cleanSource = source.replace(/^(bundle-text:|url:)/, "");
                if (importer && cleanSource.startsWith(".")) {
                    return path.resolve(path.dirname(importer), cleanSource);
                }
                return path.resolve(process.cwd(), cleanSource.replace(/^\//, ""));
            }
            return null;
        },
        load(id: string) {
            // Strip any query strings
            const cleanId = id.split("?")[0];
            if (
                cleanId.endsWith(".vert") ||
                cleanId.endsWith(".frag") ||
                cleanId.endsWith(".glsl") ||
                cleanId.endsWith(".txt")
            ) {
                if (fs.existsSync(cleanId)) {
                    const content = fs.readFileSync(cleanId, "utf-8");
                    return `export default ${JSON.stringify(content)};`;
                }
            }
            return null;
        },
    };
}

export default defineConfig({
    plugins: [parcelCompatibilityPlugin()],
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["src/testing/setup.ts"],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "json"],
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                // Type declarations contain no runtime JS instructions
                "src/**/*.d.ts",
                "src/import_types.d.ts",
                // Test files and test harness mocks are not production app code
                "src/**/*.{test,spec}.{ts,tsx}",
                "src/testing/**",
                // Static narrative portfolio articles/writeups: pure content rather than
                // testable application logic; dynamically indexed by Parcel's glob resolver
                "src/pages/articles/content/**",
            ],
        },
    },
});
