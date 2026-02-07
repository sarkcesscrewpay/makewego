// server/index.ts
import "./env"; // MUST BE FIRST
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { setServers } from "dns";

// Force DNS to use Google Public DNS
try {
  setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn("Failed to set custom DNS servers:", err);
}

// ---------- Configuration Check ----------
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("MAPBOX_ACCESS_TOKEN loaded:", process.env.MAPBOX_ACCESS_TOKEN ? "YES" : "NO");

import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { testConnection } from "./db";
import { setupWebSocket } from "./websocket";

const app = express();
const httpServer = createServer(app);

app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[API REQUEST] ${req.method} ${req.path}`);
  }
  if (req.path === "/api/driver/live-status") {
    console.log(`[DIAGNOSTIC] Matching live-status route... Headers: ${JSON.stringify(req.headers)}`);
  }
  next();
});

// Simple health check route that DOES NOT require DB
app.get("/health", (_req, res) => {
  res.send("Server is alive");
});

// Extend IncomingMessage to store rawBody
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ---------- Middleware ----------
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// ---------- Logger ----------
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const line = `${formattedTime} [${source}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(path.resolve(process.cwd(), "debug.log"), line + "\n");
  } catch (e) { }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine);
    }
  });

  next();
});

// ---------- Main Async IIFE ----------
(async () => {
  try {
    // Test MySQL connection
    const connected = await testConnection();

    if (connected) {
      console.log("✅ MySQL is ready");
      await registerRoutes(httpServer, app);
      setupWebSocket(httpServer);
    } else {
      console.error("⚠️ MySQL connection failed during startup");
      // Handle ALL HTTP methods when DB is not connected
      app.all(/^\/api\/.*$/, (_req, res) => {
        res.status(503).json({
          message: "Database connection not ready",
          error: "MySQL connection failed",
          troubleshooting: [
            "1. Check if DATABASE_URL is set in your .env file",
            "2. Ensure MySQL server is running",
            "3. Verify database credentials",
            "4. Run 'npx drizzle-kit push' to create tables"
          ]
        });
      });
    }

    // Global error handler
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) return next(err);

      res.status(status).json({ message });
    });

    // Serve static files in production, Vite dev server otherwise
    const distExists = fs.existsSync(path.resolve(process.cwd(), "dist"));
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction || (distExists && process.env.NODE_ENV !== "development")) {
      if (distExists) {
        log(`Serving static files from dist (NODE_ENV: ${process.env.NODE_ENV})`);
      } else {
        log("Serving static files (dist not found, but NODE_ENV is production)");
      }
      serveStatic(app);
    } else {
      log("Starting Vite dev server (development mode)");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }


    // Start HTTP server
    const rawPort = process.env.PORT || "5000";
    const preferredPort = isNaN(Number(rawPort)) ? rawPort : parseInt(rawPort, 10);

    // Auto-detect available port if preferred port is in use (development mode only)
    let port: number | string = preferredPort;
    if (typeof preferredPort === 'number' && process.env.NODE_ENV !== 'production') {
      try {
        const { default: detectPort } = await import('detect-port');
        const availablePort = await detectPort(preferredPort);
        if (availablePort !== preferredPort) {
          console.warn(`⚠️ Port ${preferredPort} is in use, using available port ${availablePort}`);
          port = availablePort;
        }
      } catch (err) {
        console.warn("Port detection failed, using preferred port:", err);
      }
    }

    httpServer.listen(port as any, "0.0.0.0", () => {
      log(`✅ Server running on ${typeof port === 'string' ? 'pipe ' : 'port '}${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();
