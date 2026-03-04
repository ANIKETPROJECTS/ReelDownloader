import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { api } from "../shared/routes.js";
import { z } from "zod";
import { Readable } from "stream";
// @ts-ignore
import instagramGetUrl from 'instagram-url-direct';

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

      if (response.body) {
        // @ts-ignore
        const nodeStream = Readable.fromWeb(response.body);
        nodeStream.on("error", (err) => {
          console.error("Proxy stream error:", err);
          if (!res.headersSent) res.status(500).send("Error streaming video");
        });
        nodeStream.pipe(res);
      } else {
        res.status(500).send("Empty response body");
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
      
      // Handle potential default export or commonjs mismatch
      let getUrl = instagramGetUrl;
      if (typeof getUrl !== 'function' && getUrl && (getUrl as any).instagramGetUrl) {
        getUrl = (getUrl as any).instagramGetUrl;
      } else if (typeof getUrl !== 'function' && getUrl && (getUrl as any).default) {
        getUrl = (getUrl as any).default;
      }

      if (typeof getUrl !== 'function') {
        console.error("instagram-url-direct is not a function. Value:", instagramGetUrl);
        throw new Error("Downloader library initialization failed");
      }

      const result = await (getUrl as any)(input.url);
      
      if (!result || !result.url_list || result.url_list.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Could not find a downloadable video for this URL. Please ensure the account is public." 
        });
      }

      // Try to find the highest quality video URL if multiple are provided
      // Often the library returns a list where we can try to pick the best one
      // For now, we'll stick with the first one but log if there are others
      const videoUrl = result.url_list[0];
      
      console.log(`Found ${result.url_list.length} video URLs. Using the first one.`);
      
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
      res.status(500).json({ message: "Internal server error. Failed to fetch the Reel." });
    }
  });

  return httpServer;
}
