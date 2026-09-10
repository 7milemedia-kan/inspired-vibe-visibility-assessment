import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import session from "express-session";
import { randomBytes } from "node:crypto";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

/**
 * Admin session. The lead table holds names, emails and phone numbers, so
 * access cannot ride in a URL parameter the way it used to — query strings
 * leak through history, referrers and shared screenshots.
 *
 * The cookie name uses the __Host- prefix in production, which pins it to
 * this exact origin, forbids a Domain attribute and requires Secure. It
 * cannot be set by a subdomain or over plain HTTP.
 */
const isProd = process.env.NODE_ENV === "production";
app.set("trust proxy", 1);
app.use(
  session({
    name: isProd ? "__Host-iv.sid" : "iv.sid",
    // No literal fallback. A hardcoded secret compiled into the bundle would
    // let anyone who reads it forge an admin cookie outright — no login, no
    // throttle. If the env var is absent we mint a random one at boot: the
    // cost is that existing sessions do not survive a restart, which is
    // already true of the in-memory store.
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

declare module "express-session" {
  interface SessionData {
    admin?: boolean;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Routes whose responses may carry contact details or credentials. These
  // get status lines only — never a body — so PII never reaches the logs.
  const SENSITIVE = ["/api/lead", "/api/admin", "/api/leads", "/api/contacts"];

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const sensitive = SENSITIVE.some((p) => path.startsWith(p));
      if (capturedJsonResponse && !sensitive) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: process.platform !== "win32",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
