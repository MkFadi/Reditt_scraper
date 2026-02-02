import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { scrapeConfigSchema, type RedditPost, type RedditComment, type CleanExportItem, type FlatExportItem } from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DELAY_BETWEEN_REQUESTS = 2000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRedditJSON(url: string, retries = 2): Promise<unknown> {
  const urls = [
    url,
    url.replace("https://www.reddit.com", "https://old.reddit.com"),
  ];

  let lastError: Error | null = null;

  for (const tryUrl of urls) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(tryUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          return response.json();
        }

        if (response.status === 429) {
          if (attempt < retries) {
            await delay(5000 * (attempt + 1));
            continue;
          }
          throw new Error("Rate limited by Reddit. Please wait a few minutes and try again.");
        }

        if (response.status === 403) {
          lastError = new Error("Reddit is blocking requests from this server. This is a known limitation when running from cloud environments. The app works correctly when run locally.");
          break;
        }

        throw new Error(`Reddit API error: ${response.status}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Reddit")) {
          lastError = error;
          break;
        }
        lastError = error instanceof Error ? error : new Error("Network error");
        if (attempt < retries) {
          await delay(2000);
          continue;
        }
      }
    }
  }

  throw lastError || new Error("Failed to fetch from Reddit");
}

function isMediaPost(post: Record<string, unknown>): boolean {
  const postHint = post.post_hint as string | undefined;
  const mediaHints = ["image", "hosted:video", "rich:video", "gallery"];
  if (postHint && mediaHints.includes(postHint)) return true;

  if (post.is_gallery === true) return true;

  const url = (post.url as string) || "";
  const mediaExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  if (mediaExtensions.some((ext) => url.toLowerCase().endsWith(ext))) return true;

  if (post.preview !== undefined && post.preview !== null) return true;
  if (post.media !== undefined && post.media !== null) return true;

  return false;
}

function extractPost(postData: Record<string, unknown>): RedditPost {
  return {
    id: postData.id as string,
    title: postData.title as string,
    selftext: (postData.selftext as string) || "",
    permalink: postData.permalink as string,
    url: postData.url as string,
    created_utc: postData.created_utc as number,
    score: postData.score as number,
  };
}

async function fetchPosts(
  subreddit: string,
  sortBy: string,
  targetCount: number,
  skipCount: number,
  sendProgress: (data: Record<string, unknown>) => void
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  let after: string | null = null;
  let attempts = 0;
  const maxAttempts = 100;
  const totalNeeded = skipCount + targetCount;

  while (allPosts.length < totalNeeded && attempts < maxAttempts) {
    attempts++;
    let url = `https://www.reddit.com/r/${subreddit}/${sortBy}.json?limit=100`;
    if (sortBy === "top") {
      url += "&t=all";
    }
    if (after) {
      url += `&after=${after}`;
    }

    try {
      const data = (await fetchRedditJSON(url)) as Record<string, unknown>;
      const listing = data.data as Record<string, unknown>;
      const children = listing.children as Array<{ data: Record<string, unknown> }>;

      if (!children || children.length === 0) {
        break;
      }

      for (const child of children) {
        const postData = child.data;
        if (!isMediaPost(postData)) {
          allPosts.push(extractPost(postData));
          
          const collectedAfterSkip = Math.max(0, allPosts.length - skipCount);
          if (allPosts.length <= skipCount) {
            sendProgress({
              type: "progress",
              postsFound: 0,
              message: `Skipping posts... (${allPosts.length}/${skipCount})`,
            });
          } else {
            sendProgress({
              type: "progress",
              postsFound: collectedAfterSkip,
              message: `Found ${collectedAfterSkip} text posts (skipped ${skipCount})...`,
            });
          }
          
          if (allPosts.length >= totalNeeded) break;
        }
      }

      after = listing.after as string | null;
      if (!after) break;

      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      throw error;
    }
  }

  // Skip the first N posts and return the rest
  return allPosts.slice(skipCount, skipCount + targetCount);
}

async function fetchComments(
  permalink: string,
  limit: number
): Promise<RedditComment[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=500&sort=top`;
  const data = (await fetchRedditJSON(url)) as unknown[];

  if (!Array.isArray(data) || data.length < 2) {
    return [];
  }

  const commentsListing = (data[1] as Record<string, unknown>).data as Record<string, unknown>;
  const children = commentsListing.children as Array<{ data: Record<string, unknown> }>;

  const comments: RedditComment[] = [];
  let rank = 1;

  for (const child of children) {
    if (comments.length >= limit) break;

    const commentData = child.data;
    const body = commentData.body as string | undefined;

    if (!body || body === "[deleted]" || body === "[removed]") {
      continue;
    }

    comments.push({
      rank,
      id: commentData.id as string,
      body,
      score: commentData.score as number,
    });
    rank++;
  }

  return comments;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/scrape", async (req: Request, res: Response) => {
    const parseResult = scrapeConfigSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.message });
      return;
    }

    const config = parseResult.data;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendSSE = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const skipMessage = config.skipPosts > 0 
        ? `Fetching posts (will skip first ${config.skipPosts})...` 
        : "Fetching posts...";
      sendSSE({ type: "progress", message: skipMessage, postsFound: 0, postsProcessed: 0, commentsCollected: 0 });

      const posts = await fetchPosts(config.subreddit, config.sortBy, config.postCount, config.skipPosts, sendSSE);

      if (posts.length === 0) {
        sendSSE({ type: "error", message: "No text posts found in this subreddit." });
        res.end();
        return;
      }

      const results: Array<CleanExportItem | FlatExportItem> = [];
      let totalComments = 0;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        sendSSE({
          type: "progress",
          postsFound: posts.length,
          postsProcessed: i,
          commentsCollected: totalComments,
          message: `Processing post ${i + 1}/${posts.length}...`,
        });

        try {
          const comments = await fetchComments(post.permalink, config.commentsPerPost);
          totalComments += comments.length;

          if (config.exportMode === "clean") {
            results.push({
              post,
              comments,
            } as CleanExportItem);
          } else {
            const flatItem: FlatExportItem = {
              Post: post.selftext ? `${post.title}\n\n${post.selftext}` : post.title,
            };
            comments.forEach((comment, idx) => {
              flatItem[`Kommentar ${idx + 1}` as `Kommentar ${number}`] = comment.body;
            });
            results.push(flatItem);
          }

          await delay(DELAY_BETWEEN_REQUESTS);
        } catch (error) {
          console.error(`Error fetching comments for post ${post.id}:`, error);
          continue;
        }
      }

      sendSSE({
        type: "progress",
        postsFound: posts.length,
        postsProcessed: posts.length,
        commentsCollected: totalComments,
        message: "Finalizing...",
      });

      const message = posts.length < config.postCount
        ? `Complete! Found ${posts.length} text posts (target was ${config.postCount}).`
        : `Complete! Collected ${posts.length} posts with ${totalComments} comments.`;

      sendSSE({
        type: "complete",
        message,
        data: results,
      });

      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      sendSSE({ type: "error", message });
      res.end();
    }
  });

  return httpServer;
}
