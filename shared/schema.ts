import { z } from "zod";

export const scrapeConfigSchema = z.object({
  subreddit: z.string().min(1, "Subreddit name is required"),
  postCount: z.number().min(1).max(1000).default(200),
  skipPosts: z.number().min(0).max(5000).default(0),
  commentsPerPost: z.number().min(1).max(200).default(10),
  sortBy: z.enum(["top", "new", "hot"]).default("top"),
  exportMode: z.enum(["clean", "flat_labels"]).default("clean"),
});

export type ScrapeConfig = z.infer<typeof scrapeConfigSchema>;

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  url: string;
  created_utc: number;
  score: number;
}

export interface RedditComment {
  rank: number;
  id: string;
  body: string;
  score: number;
}

export interface CleanExportItem {
  post: RedditPost;
  comments: RedditComment[];
}

export interface FlatExportItem {
  Post: string;
  [key: `Kommentar ${number}`]: string;
}

export type ExportData = CleanExportItem[] | FlatExportItem[];

export interface ScrapeProgress {
  postsFound: number;
  postsProcessed: number;
  commentsCollected: number;
  targetPosts: number;
  status: "idle" | "scraping" | "complete" | "error";
  message?: string;
}
