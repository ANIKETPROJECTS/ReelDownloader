import serverless from "serverless-http";

let cachedServer: any;

export default async function handler(req: any, res: any) {
  try {
    console.log("===== VERCEL FUNCTION START =====");
    console.log("Method:", req.method);
    console.log("URL:", req.url);

    // initialize once
    if (!cachedServer) {
      console.log("Initializing Express app...");

      const mod = await import("../server/index.cjs");
      const app = mod.app || mod.default || mod;

      if (!app) {
        throw new Error("Express app export not found in server/index.cjs");
      }

      cachedServer = serverless(app);

      console.log("Express server initialized");
    }

    // convert Vercel req/res to serverless-http format
    return cachedServer(req, res);
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
