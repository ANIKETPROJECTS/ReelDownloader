import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
// @ts-ignore
import instagramGetUrl from 'instagram-url-direct';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

      const result = await getUrl(input.url);
      
      if (!result || !result.url_list || result.url_list.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Could not find a downloadable video for this URL. Please ensure the account is public." 
        });
      }

      const videoUrl = result.url_list[0];
      
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
