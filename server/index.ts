// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup initialization promise to ensure routes are registered before handling requests
let initialized: Promise<void> | null = null;

export async function initApp() {
  if (initialized) return initialized;
  
  initialized = (async () => {
    const httpServer = createServer(app);
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

    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
    } else if (!process.env.VERCEL && !process.env.NETLIFY) {
      const { serveStatic } = await import("./static.js");
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    if (!process.env.VERCEL && !process.env.NETLIFY && process.env.NODE_ENV !== "test") {
      httpServer.listen(port, "0.0.0.0", () => {
        console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);
      });
    }
  })();
  
  return initialized;
}

// Start initialization immediately
initApp();

export default app;
