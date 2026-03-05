import serverless from "serverless-http";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const expressApp = require("../server/index.js");

const handler = serverless(expressApp);

export default async function (req: any, res: any) {
  return handler(req, res);
}
