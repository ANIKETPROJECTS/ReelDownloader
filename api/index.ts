import serverless from "serverless-http";

export default async function handler(req: any, res: any) {
  const mod = await import("../server/index.js");
  const app = mod.default || mod.app || mod;

  const server = serverless(app);
  return server(req, res);
}
