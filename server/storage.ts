import { db } from "./db.js";
import {
  downloads,
  type InsertDownload,
  type Download
} from "../shared/schema.js";
import { eq } from "drizzle-orm";

export interface IStorage {
  getDownloads(): Promise<Download[]>;
  createDownload(download: InsertDownload): Promise<Download>;
}

export class DatabaseStorage implements IStorage {
  async getDownloads(): Promise<Download[]> {
    return await db.select().from(downloads);
  }

  async createDownload(download: InsertDownload): Promise<Download> {
    const [created] = await db.insert(downloads).values(download).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
