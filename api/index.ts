import serverless from "serverless-http";

let server: any;

export default async function handler(req: any, res: any) {
  if (!server) {
    const mod = await import("../server/index.cjs");
    const app = mod.app || mod.default || mod;

    server = serverless(app);
  }

  // IMPORTANT: rewrite URL so Express sees the correct route
  req.url = req.url.replace(/^\/api/, "");

  return server(req, res);
}
