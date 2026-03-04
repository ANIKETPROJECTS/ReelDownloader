import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    // In Vercel, we might not have the dist path during runtime if not configured correctly,
    // but for now let's make it more robust.
    console.warn(`Static directory not found at ${distPath}`);
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
