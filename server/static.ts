import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  let distPath = path.resolve(process.cwd(), "dist");

  // Fallback check for common hosting structures
  if (!fs.existsSync(distPath)) {
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    if (fs.existsSync(publicPath)) {
      distPath = publicPath;
    }
  }

  console.log(`[Static] Serving files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[Static] ERROR: Could not find build directory: ${distPath}`);
  }

  app.use(express.static(distPath, {
    index: false, // Don't serve index.html automatically for /
  }));

  // Middleware catch-all for SPA routing
  app.use((req, res, next) => {
    // Skip if it is an API route
    if (req.path.startsWith("/api")) {
      return next();
    }

    // CRITICAL: Check if the request is for an asset (e.g. .js, .css, .png, etc.)
    // If it is, and we've reached here, it means the asset was NOT found in express.static.
    // We should return a 404 instead of serving index.html, which causes MIME errors.
    const ext = path.extname(req.path).toLowerCase();
    const assetExtensions = [".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".json"];
    if (ext && assetExtensions.includes(ext) && ext !== ".html") {
      console.warn(`[Static] Asset not found (served 404): ${req.path}`);
      return res.status(404).end();
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Front-end build not found. Please run 'npm run build' first.");
    }
  });
}

