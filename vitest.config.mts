import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

import swc from "@swc/core";

/**
 * Custom Vite plugin to emulate Parcel 2 asset import behaviors:
 * 1. Shaders (.vert, .frag, .glsl) export raw GLSL string content.
 * 2. Prefixes like "bundle-text:" and "url:" resolve cleanly to underlying files.
 * 3. Transpiles Stage 3 TC39 decorators & auto-accessors using SWC for Lit elements.
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
        transform(code: string, id: string) {
            const cleanId = id.split("?")[0];
            if (cleanId.endsWith(".ts") || cleanId.endsWith(".tsx")) {
                if (code.includes("@property") || code.includes("@state") || code.includes("accessor ")) {
                    const result = swc.transformSync(code, {
                        filename: cleanId,
                        jsc: {
                            parser: {
                                syntax: "typescript",
                                tsx: cleanId.endsWith(".tsx"),
                                decorators: true,
                            },
                            transform: {
                                decoratorVersion: "2022-03",
                            },
                        },
                    });
                    return {
                        code: result.code,
                        map: result.map,
                    };
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
        setupFiles: ["src/testing/setup.ts"],
        projects: [
            {
                test: {
                    name: "node",
                    environment: "node",
                    include: ["src/**/*.{test,spec}.ts"],
                    exclude: ["src/**/*element*.{test,spec}.ts"],
                    setupFiles: ["src/testing/setup.ts"],
                },
            },
            {
                test: {
                    name: "dom",
                    environment: "happy-dom",
                    include: [
                        "src/**/*.{test,spec}.tsx",
                        "src/**/*element*.{test,spec}.ts",
                    ],
                    setupFiles: ["src/testing/setup.ts"],
                },
            },
        ],
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
