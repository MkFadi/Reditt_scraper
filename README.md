# Reddit Data Scraper

A web application for collecting Reddit posts and comments to build training datasets. Filters out media posts and collects text-only content with top-level comments.

## Requirements

- **Node.js** 18 or higher
- **npm** (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/MkFadi/Reditt_scraper.git
cd Reditt_scraper
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm run dev
```

4. Open your browser and go to:
```
http://localhost:5000
```

## Features

- **Subreddit Selection**: Enter any subreddit name to scrape
- **Post Count**: Choose how many posts to collect (1-1000)
- **Skip Posts**: Skip the first N posts before collecting (useful for pagination)
- **Comments per Post**: Set how many top-level comments to collect per post (1-200)
- **Sort Order**: Choose between Top, New, or Hot posts
- **Export Formats**:
  - **Clean**: Structured JSON with full metadata
  - **Flat Labels**: Simplified format with Post and Kommentar fields

## How It Works

1. Enter a subreddit name (without the r/ prefix)
2. Configure your scraping parameters
3. Click "Start Scraping"
4. Watch the real-time progress
5. Download the JSON file when complete

## Export Formats

### Clean Format
```json
[
  {
    "post": {
      "id": "abc123",
      "title": "Post title",
      "selftext": "Post content",
      "permalink": "/r/subreddit/...",
      "score": 100,
      "created_utc": 1234567890
    },
    "comments": [
      {
        "rank": 1,
        "id": "xyz789",
        "body": "Comment text",
        "score": 50
      }
    ]
  }
]
```

### Flat Labels Format
```json
[
  {
    "Post": "Post title\n\nPost content",
    "Kommentar 1": "First comment",
    "Kommentar 2": "Second comment"
  }
]
```

## Running on Different Operating Systems

### Windows

1. Download Node.js from https://nodejs.org (LTS version recommended)
2. Run the installer
3. Open Command Prompt or PowerShell
4. Navigate to the project folder and run:
```bash
npm install
npm run dev
```

### macOS

1. Install Node.js via Homebrew:
```bash
brew install node
```
Or download from https://nodejs.org

2. Open Terminal and run:
```bash
npm install
npm run dev
```

### Linux (Ubuntu/Debian)

1. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Run the application:
```bash
npm install
npm run dev
```

### Linux (Fedora/RHEL)

1. Install Node.js:
```bash
sudo dnf install nodejs
```

2. Run the application:
```bash
npm install
npm run dev
```

## Important Notes

- **Rate Limiting**: The app includes a 2-second delay between Reddit API requests to avoid being blocked
- **Cloud Servers**: Reddit may block requests from cloud/datacenter IPs. Running locally on your home network works best
- **No Authentication**: Uses Reddit's public JSON API, no login required
- **Text Posts Only**: Automatically filters out images, videos, and galleries

## Troubleshooting

**"Reddit is blocking requests"**
- This happens when running from cloud servers. Run the app locally on your PC instead.

**"Rate limited by Reddit"**
- Wait a few minutes before trying again. The app already includes delays to prevent this.

**"No text posts found"**
- The subreddit may only have media posts, or the name might be incorrect.

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express
- Build Tool: Vite
