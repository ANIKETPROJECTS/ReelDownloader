import serverless from "serverless-http";

let server: any = null;

export default async function handler(req: any, res: any) {
  try {
    console.log("===== VERCEL FUNCTION START =====");
    console.log("Method:", req.method);
    console.log("Original URL:", req.url);

    // initialize express only once
    if (!server) {
      console.log("Initializing Express app...");

      const mod = await import("../server/index.cjs");
      const app = mod.app || mod.default || mod;

      if (!app) {
        console.error("Express app export not found");
        throw new Error("Express app export not found in server/index.cjs");
      }

      server = serverless(app);
      console.log("Express server initialized");
    }

    // remove /api prefix so express routes work
    if (req.url.startsWith("/api")) {
      req.url = req.url.replace(/^\/api/, "") || "/";
    }

    console.log("Rewritten URL:", req.url);

    const result = await server(req, res);

    console.log("Request handled successfully");
    console.log("===== VERCEL FUNCTION END =====");

    return result;
  } catch (err: any) {
    console.error("Serverless handler error:", err);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");

    res.end(
      JSON.stringify({
        error: "Server error",
        message: err?.message || "Unknown error",
      }),
    );
  }
}
