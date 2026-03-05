import serverless from "serverless-http";

let server: any = null;

export default async function handler(req: any, res: any) {
  try {
    console.log("===== VERCEL FUNCTION START =====");
    console.log("Method:", req.method);
    console.log("URL:", req.url);

    // Initialize Express only once
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

    // DO NOT rewrite URL
    // serverless-http already handles routing correctly

    const response = await server(req, res);

    console.log("Request handled successfully");
    console.log("===== VERCEL FUNCTION END =====");

    return response;
  } catch (err: any) {
    console.error("Serverless handler error:", err);

    if (!res.headersSent) {
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
}
