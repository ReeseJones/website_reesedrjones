const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

let gitCommit = "unknown";
let gitBranch = "unknown";

try {
    gitCommit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
} catch {}

try {
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
} catch {}

const buildTimestamp = new Date().toISOString();

const content = `// This file is auto-generated during build by scripts/generate_version.js. Do not edit directly.

export const APP_VERSION = "${pkg.version}";
export const GIT_COMMIT = "${gitCommit}";
export const GIT_BRANCH = "${gitBranch}";
export const BUILD_TIMESTAMP = "${buildTimestamp}";
`;

const outputPath = path.resolve(__dirname, "../src/version.ts");
fs.writeFileSync(outputPath, content, "utf-8");

console.log(`[generate_version] Generated src/version.ts: v${pkg.version} (${gitCommit} on ${gitBranch}) at ${buildTimestamp}`);
