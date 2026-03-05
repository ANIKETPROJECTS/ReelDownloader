import serverless from "serverless-http";

let server: any;

export default async function handler(req: any, res: any) {
  if (!server) {
    const mod = await import("../server/index.cjs");
    const app = mod.app || mod.default || mod;

    server = serverless(app);
  }

  return server(req, res);
}
