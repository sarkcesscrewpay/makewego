import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { builtinModules } from "module";

// Node.js built-in modules (both with and without node: prefix)
const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
];

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist: string[] = [
  // Keeping this empty to force all dependencies to be external (node_modules).
  // This avoids bundling CJS/ESM mixed dependencies which causes "Dynamic require" errors.
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    ...nodeBuiltins,
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    define: {
      // "process.env.NODE_ENV": '"production"', // Removed to allow runtime env usage and avoid "assign to constant" warning
    },
    minify: true,
    external: externals,
    logLevel: "info",
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
