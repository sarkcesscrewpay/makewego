import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: {
        server: server,
        clientPort: 5000,
      },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Skip if it looks like an asset request (has an extension)
      // This allows Express to skip these and they'll eventually 404
      // instead of being caught by this and served as text/html
      const ext = path.extname(url);
      if (ext && ext !== ".html") {
        return next();
      }

      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
