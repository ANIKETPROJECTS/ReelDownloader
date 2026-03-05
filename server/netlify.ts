import serverless from "serverless-http";
// @ts-ignore
import app from "./index.ts";

export const handler = serverless(app);
export default app;
