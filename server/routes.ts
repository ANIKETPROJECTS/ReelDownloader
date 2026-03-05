// import type { Express } from "express";
// import type { Server } from "http";
// import { storage } from "./storage.js";
// import { api } from "../shared/routes.js";
// import { z } from "zod";
// import { Readable } from "stream";

// // Use dynamic import for ESM compatibility in bundled environments
// let instagramGetUrl: any;
// async function initDownloader() {
//   if (instagramGetUrl) return instagramGetUrl;

//   try {
//     console.log("Attempting to import instagram-url-direct...");
//     // @ts-ignore
//     const mod = await import('instagram-url-direct');
//     const instagramGetUrlRaw = mod && (mod.default || mod);
//     console.log("Import successful, type:", typeof instagramGetUrlRaw);

//     // Handle different export patterns
//     if (typeof mod === 'function') {
//       instagramGetUrl = mod;
//     } else if (mod && typeof mod.default === 'function') {
//       instagramGetUrl = mod.default;
//     } else if (mod && typeof mod.instagramGetUrl === 'function') {
//       instagramGetUrl = mod.instagramGetUrl;
//     } else if (instagramGetUrlRaw && typeof instagramGetUrlRaw === 'function') {
//       instagramGetUrl = instagramGetUrlRaw;
//     } else {
//       console.error("Could not find downloader function in module. Module keys:", Object.keys(mod || {}));
//       throw new Error("Downloader function not found");
//     }

//     return instagramGetUrl;
//   } catch (err) {
//     console.error("Failed to import instagram-url-direct:", err);
//     throw err;
//   }
// }

// const __filename_local = "";

// export async function registerRoutes(
//   httpServer: Server,
//   app: Express
// ): Promise<Server> {

//   app.get("/api/proxy", async (req, res) => {
//     const videoUrl = req.query.url as string;
//     if (!videoUrl) {
//       return res.status(400).send("URL is required");
//     }

//     try {
//       const response = await fetch(videoUrl, {
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//           'Referer': 'https://www.instagram.com/'
//         }
//       });
//       if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);

//     const contentType = response.headers.get("content-type") || "video/mp4";
//     res.setHeader("Content-Type", contentType);
//     res.setHeader("Content-Disposition", 'attachment; filename="instagram-reel.mp4"');
//     res.setHeader("Access-Control-Allow-Origin", "*");

//     if (response.body) {
//       // @ts-ignore
//       const nodeStream = Readable.fromWeb(response.body);
//       nodeStream.on("error", (err) => {
//         console.error("Proxy stream error:", err);
//         if (!res.headersSent) {
//           res.status(500).json({
//             success: false,
//             message: "Error streaming video",
//             error: err.message
//           });
//         }
//       });
//       nodeStream.pipe(res);
//     } else {
//       res.status(500).json({ success: false, message: "Empty response body" });
//     }
//     } catch (error) {
//       console.error("Proxy error:", error);
//       if (!res.headersSent) res.status(500).send("Failed to download video");
//     }
//   });

//   app.post(api.reels.download.path, async (req, res) => {
//     try {
//       console.log(`[${new Date().toISOString()}] Received download request for URL: ${req.body?.url}`);

//       if (!req.body) {
//         console.error("Request body is missing");
//         return res.status(400).json({ success: false, message: "Request body is missing" });
//       }

//       const input = api.reels.download.input.parse(req.body);
//       console.log(`[${new Date().toISOString()}] Validated input URL: ${input.url}`);

//       let getUrl;
//       try {
//         console.log(`[${new Date().toISOString()}] Initializing downloader...`);
//         getUrl = await initDownloader();
//         console.log(`[${new Date().toISOString()}] Downloader initialized successfully`);
//       } catch (initErr) {
//         console.error(`[${new Date().toISOString()}] Failed to initialize downloader:`, initErr);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to initialize downloader library",
//           error: initErr instanceof Error ? initErr.message : String(initErr)
//         });
//       }

//       if (typeof getUrl !== 'function') {
//         console.error(`[${new Date().toISOString()}] Downloader library is not a function. Value type: ${typeof getUrl}`);
//         return res.status(500).json({
//           success: false,
//           message: "Downloader library initialization failed",
//           error: "Library is not a function"
//         });
//       }

//       console.log(`[${new Date().toISOString()}] Calling downloader library for URL: ${input.url}`);
//       const timeoutPromise = new Promise((_, reject) =>
//         setTimeout(() => reject(new Error("Downloader library timed out after 15s")), 15000)
//       );

//       const result = await Promise.race([
//         getUrl(input.url),
//         timeoutPromise
//       ]).catch((e: any) => {
//         console.error(`[${new Date().toISOString()}] Library call failed or timed out. Error:`, e);
//         throw e;
//       });

//       console.log(`[${new Date().toISOString()}] Library response received. Success: ${!!result}`);
//       if (result) {
//         console.log(`[${new Date().toISOString()}] Result keys: ${Object.keys(result).join(', ')}`);
//       }

//       if (!result || (!result.url_list && !result.results)) {
//         console.warn("No video URLs found in library response for:", input.url);
//         return res.status(400).json({
//           success: false,
//           message: "Could not find a downloadable video for this URL. Please ensure the account is public."
//         });
//       }

//       // Handle different result formats from the library
//       const urlList = result.url_list || result.results || [];
//       if (urlList.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message: "No video URLs found in the response."
//         });
//       }

//       const videoUrl = typeof urlList[0] === 'string' ? urlList[0] : urlList[0].url;

//       console.log(`Found ${urlList.length} video URLs. Using: ${videoUrl}`);

//       // Save the download attempt to the database
//       await storage.createDownload({
//         url: input.url,
//         status: "success"
//       });

//       res.status(200).json({
//         success: true,
//         videoUrl: videoUrl,
//         message: "Reel processed successfully"
//       });
//     } catch (err) {
//       console.error("Error in /api/reels/download:", err);

//       if (err instanceof z.ZodError) {
//         return res.status(400).json({
//           success: false,
//           message: err.errors[0].message,
//           error: "Validation Error",
//           field: err.errors[0].path.join('.'),
//         });
//       }

//       res.status(500).json({
//         success: false,
//         message: "Internal server error. Failed to fetch the Reel.",
//         error: err instanceof Error ? err.message : String(err)
//       });
//     }
//   });

//   return httpServer;
// }
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { api } from "../shared/routes.js";
import { z } from "zod";
import { Readable } from "stream";

/* ---------------- GLOBAL EXPRESS LOGGER ---------------- */

function attachLogger(app: Express) {
  app.use((req, res, next) => {
    console.log(`[EXPRESS] ${req.method} ${req.url}`);
    next();
  });
}

/* ---------------- DOWNLOADER LOADER ---------------- */

let instagramGetUrl: any;

async function initDownloader() {
  if (instagramGetUrl) return instagramGetUrl;

  try {
    console.log("Loading instagram-url-direct...");

    const mod: any = await import("instagram-url-direct");

    instagramGetUrl = mod?.default || mod?.instagramGetUrl || mod;

    if (typeof instagramGetUrl !== "function") {
      throw new Error("Downloader function not found in module");
    }

    console.log("Downloader loaded successfully");

    return instagramGetUrl;
  } catch (err) {
    console.error("Downloader import failed:", err);
    throw err;
  }
}

/* ---------------- REGISTER ROUTES ---------------- */

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  attachLogger(app);

  /* ---------------- VIDEO PROXY ---------------- */

  app.get("/proxy", async (req, res) => {
    const videoUrl = req.query.url as string;

    console.log("[PROXY] Requested URL:", videoUrl);

    if (!videoUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Referer: "https://www.instagram.com/",
        },
      });

      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "video/mp4";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="instagram-reel.mp4"',
      );
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (!response.body) {
        return res
          .status(500)
          .json({ success: false, message: "Empty response body" });
      }

      const nodeStream = Readable.fromWeb(response.body as any);

      nodeStream.on("error", (err) => {
        console.error("[PROXY STREAM ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Stream error",
            error: err.message,
          });
        }
      });

      nodeStream.pipe(res);
    } catch (err) {
      console.error("[PROXY ERROR]", err);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Proxy download failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });

  /* ---------------- REEL DOWNLOAD ---------------- */

  app.post("/api/reels/download", async (req, res) => {
    try {
      console.log("===== DOWNLOAD REQUEST START =====");
      console.log("Body:", req.body);

      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: "Request body missing",
        });
      }

      const input = api.reels.download.input.parse(req.body);

      console.log("Validated URL:", input.url);

      const downloader = await initDownloader();

      console.log("Downloader ready");

      const result = await Promise.race([
        downloader(input.url),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Downloader timeout (15s)")),
            15000,
          ),
        ),
      ]);

      console.log("Downloader response:", result);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Downloader returned empty result",
        });
      }

      const urlList = result.url_list || result.results || [];

      if (!urlList.length) {
        return res.status(400).json({
          success: false,
          message: "No video URLs found",
        });
      }

      const videoUrl =
        typeof urlList[0] === "string" ? urlList[0] : urlList[0].url;

      console.log("Selected video URL:", videoUrl);

      try {
        await storage.createDownload({
          url: input.url,
          status: "success",
        });
      } catch (dbErr) {
        console.warn("DB logging failed:", dbErr);
      }

      res.json({
        success: true,
        videoUrl,
        message: "Reel processed successfully",
      });

      console.log("===== DOWNLOAD REQUEST END =====");
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);

      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
          error: "Validation error",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ---------------- FALLBACK ROUTE ---------------- */

  app.use((req, res) => {
    console.log("[EXPRESS] Unmatched route:", req.method, req.url);

    res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.url,
    });
  });

  return httpServer;
}
