import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SiReddit } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

import { scrapeConfigSchema, type ScrapeConfig, type ScrapeProgress, type ExportData } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<ScrapeProgress>({
    postsFound: 0,
    postsProcessed: 0,
    commentsCollected: 0,
    targetPosts: 200,
    status: "idle",
  });
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const form = useForm<ScrapeConfig>({
    resolver: zodResolver(scrapeConfigSchema),
    defaultValues: {
      subreddit: "",
      postCount: 200,
      skipPosts: 0,
      commentsPerPost: 10,
      sortBy: "top",
      exportMode: "clean",
    },
  });

  const isScraping = progress.status === "scraping";

  const startScraping = useCallback(async (config: ScrapeConfig) => {
    setProgress({
      postsFound: 0,
      postsProcessed: 0,
      commentsCollected: 0,
      targetPosts: config.postCount,
      status: "scraping",
      message: "Starting scrape...",
    });
    setExportData(null);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start scraping");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                setProgress((prev) => ({
                  ...prev,
                  postsFound: data.postsFound ?? prev.postsFound,
                  postsProcessed: data.postsProcessed ?? prev.postsProcessed,
                  commentsCollected: data.commentsCollected ?? prev.commentsCollected,
                  message: data.message,
                }));
              } else if (data.type === "complete") {
                setProgress((prev) => ({
                  ...prev,
                  status: "complete",
                  message: data.message,
                }));
                setExportData(data.data);
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      setProgress((prev) => ({
        ...prev,
        status: "error",
        message,
      }));
      toast({
        title: "Scraping failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const downloadJSON = useCallback(() => {
    if (!exportData) return;
    setIsDownloading(true);

    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const subreddit = form.getValues("subreddit");
      const mode = form.getValues("exportMode");
      a.download = `reddit_${subreddit}_${mode}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your JSON file is being downloaded.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "Failed to generate download file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [exportData, form, toast]);

  const progressPercentage = progress.targetPosts > 0
    ? Math.round((progress.postsProcessed / progress.targetPosts) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <SiReddit className="h-8 w-8 text-[#FF4500]" />
            <h1 className="text-2xl font-semibold tracking-tight">Reddit Data Scraper</h1>
          </div>
          <p className="text-muted-foreground">
            Collect Reddit posts and comments for training datasets
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
            <CardDescription>
              Enter your scraping parameters below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(startScraping)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="subreddit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subreddit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">r/</span>
                          <Input
                            {...field}
                            placeholder="de"
                            className="pl-8"
                            disabled={isScraping}
                            data-testid="input-subreddit"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter the subreddit name without the r/ prefix
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="postCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Posts</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 200)}
                            min={1}
                            max={1000}
                            disabled={isScraping}
                            data-testid="input-post-count"
                          />
                        </FormControl>
                        <FormDescription>
                          Target: 1-1000
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skipPosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skip Posts</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            min={0}
                            max={5000}
                            disabled={isScraping}
                            data-testid="input-skip-posts"
                          />
                        </FormControl>
                        <FormDescription>
                          Skip first N posts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commentsPerPost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments per Post</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                            min={1}
                            max={200}
                            disabled={isScraping}
                            data-testid="input-comments-per-post"
                          />
                        </FormControl>
                        <FormDescription>
                          Top-level: 1-200
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sortBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Sort</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isScraping}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-sort-by">
                              <SelectValue placeholder="Select sort order" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="top">Top Posts</SelectItem>
                            <SelectItem value="new">New Posts</SelectItem>
                            <SelectItem value="hot">Hot Posts</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How to sort posts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Format</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isScraping}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-export-mode">
                              <SelectValue placeholder="Select export format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clean">Clean (Structured)</SelectItem>
                            <SelectItem value="flat_labels">Flat Labels</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          JSON output structure
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isScraping}
                  data-testid="button-start"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Scraping
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {progress.status !== "idle" && (
          <Card className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                {progress.status === "scraping" && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {progress.status === "complete" && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                )}
                {progress.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <CardTitle className="text-lg">
                  {progress.status === "scraping" && "Scraping in Progress"}
                  {progress.status === "complete" && "Scraping Complete"}
                  {progress.status === "error" && "Scraping Failed"}
                </CardTitle>
              </div>
              {progress.message && (
                <CardDescription>{progress.message}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">
                    {progress.postsFound}
                    <span className="text-lg text-muted-foreground">/{progress.targetPosts}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Posts Found</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">{progress.postsProcessed}</p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">{progress.commentsCollected}</p>
                  <p className="text-sm text-muted-foreground">Comments</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {progress.status === "complete" && exportData && (
                <Button
                  onClick={downloadJSON}
                  className="w-full"
                  size="lg"
                  disabled={isDownloading}
                  data-testid="button-download"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Download...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download JSON ({(exportData as unknown[]).length} posts)
                    </>
                  )}
                </Button>
              )}

              {progress.status === "complete" && progress.postsProcessed < progress.targetPosts && (
                <p className="text-sm text-muted-foreground text-center">
                  Note: Only {progress.postsProcessed} posts found (target was {progress.targetPosts}).
                  The subreddit may have fewer text posts available.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-sm text-muted-foreground">
          <p>Uses Reddit's public JSON API. Be mindful of rate limits.</p>
        </footer>
      </div>
    </div>
  );
}
