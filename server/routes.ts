import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { api } from "../shared/routes.js";
import { z } from "zod";
import { Readable } from "stream";

// Use dynamic import for ESM compatibility in bundled environments
let instagramGetUrl: any;
async function initDownloader() {
  if (instagramGetUrl) return instagramGetUrl;
  
  try {
    console.log("Attempting to import instagram-url-direct...");
    // @ts-ignore
    const mod = await import('instagram-url-direct');
    const instagramGetUrlRaw = mod && (mod.default || mod);
    console.log("Import successful, type:", typeof instagramGetUrlRaw);
    
    // Handle different export patterns
    if (typeof instagramGetUrlRaw === 'function') {
      instagramGetUrl = instagramGetUrlRaw;
    } else if (instagramGetUrlRaw && typeof instagramGetUrlRaw.instagramGetUrl === 'function') {
      instagramGetUrl = instagramGetUrlRaw.instagramGetUrl;
    } else if (typeof mod === 'function') {
      instagramGetUrl = mod;
    } else if (mod && typeof mod.instagramGetUrl === 'function') {
      instagramGetUrl = mod.instagramGetUrl;
    } else {
      console.error("Could not find downloader function in module:", instagramGetUrlRaw);
      throw new Error("Downloader function not found");
    }
    
    return instagramGetUrl;
  } catch (err) {
    console.error("Failed to import instagram-url-direct:", err);
    throw err;
  }
}

const __filename_local = ""; 

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/proxy", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.instagram.com/'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);

    const contentType = response.headers.get("content-type") || "video/mp4";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="instagram-reel.mp4"');
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (response.body) {
      // @ts-ignore
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.on("error", (err) => {
        console.error("Proxy stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: "Error streaming video",
            error: err.message 
          });
        }
      });
      nodeStream.pipe(res);
    } else {
      res.status(500).json({ success: false, message: "Empty response body" });
    }
    } catch (error) {
      console.error("Proxy error:", error);
      if (!res.headersSent) res.status(500).send("Failed to download video");
    }
  });

  app.post(api.reels.download.path, async (req, res) => {
    try {
      const input = api.reels.download.input.parse(req.body);
      
      console.log(`Processing Reel URL: ${input.url}`);
      
      let getUrl = await initDownloader();
      
      if (typeof getUrl !== 'function') {
        console.error("Downloader library is not a function. Value:", getUrl);
        throw new Error("Downloader library initialization failed: not a function");
      }

      console.log("Calling downloader with URL:", input.url);
      const result = await getUrl(input.url).catch((e: any) => {
        console.error("Library call failed. Full error:", e);
        if (e.stack) console.error("Stack trace:", e.stack);
        throw new Error(`Library error: ${e.message || (typeof e === 'string' ? e : JSON.stringify(e))}`);
      });
      
      console.log("Downloader result:", JSON.stringify(result));

      if (!result || (!result.url_list && !result.results)) {
        return res.status(400).json({ 
          success: false, 
          message: "Could not find a downloadable video for this URL. Please ensure the account is public." 
        });
      }

      // Handle different result formats from the library
      const urlList = result.url_list || result.results || [];
      if (urlList.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No video URLs found in the response." 
        });
      }

      const videoUrl = typeof urlList[0] === 'string' ? urlList[0] : urlList[0].url;
      
      console.log(`Found ${urlList.length} video URLs. Using: ${videoUrl}`);
      
      // Save the download attempt to the database
      await storage.createDownload({
        url: input.url,
        status: "success"
      });

      res.status(200).json({
        success: true,
        videoUrl: videoUrl,
        message: "Reel processed successfully"
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      
      console.error("Error downloading reel:", err);
      res.status(500).json({ 
      success: false,
      message: "Internal server error. Failed to fetch the Reel.",
      error: err instanceof Error ? err.message : String(err)
    });
    }
  });

  return httpServer;
}
