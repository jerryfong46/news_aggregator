# Twitter Monitor & Summarizer

A lightweight Next.js webapp that monitors Twitter accounts via Nitter and provides AI-powered daily summaries focused on crypto-related content (hacks, airdrops, market sentiment).

## Features

- Add/remove Twitter handles to monitor
- Daily automated scraping via Vercel Cron
- AI-powered summaries using OpenAI GPT-3.5-turbo
- Focus on security incidents, airdrops, and market sentiment
- Serverless architecture with Vercel KV storage
- Clean, modern UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Deployment**: Vercel
- **Database**: Vercel KV (Redis)
- **Scheduler**: Vercel Cron Jobs
- **Scraping**: Cheerio + fetch
- **AI**: OpenAI API (GPT-3.5-turbo)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd news_aggregator
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=your_openai_api_key_here

# Cron Secret (optional but recommended)
CRON_SECRET=your_random_secret_here

# Vercel KV (automatically provided by Vercel when deployed)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

### 3. Local Development

For local development, you'll need to set up Vercel KV:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project
vercel link

# Pull environment variables (including KV credentials)
vercel env pull .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 4. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add a **Vercel KV** database:
   - Go to your project in Vercel Dashboard
   - Navigate to Storage tab
   - Create a new KV database
   - It will automatically link to your project
4. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `CRON_SECRET`: A random secret string (optional)
5. Deploy!

### 5. Configure Cron Job

The cron job is configured in `vercel.json` to run daily at 9 AM UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-scrape",
      "schedule": "0 9 * * *"
    }
  ]
}
```

You can adjust the schedule using cron syntax. Examples:
- `0 9 * * *` - Daily at 9 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight

## Usage

### Adding Twitter Handles

1. Enter a Twitter handle (with or without @)
2. Click "Add Handle"
3. The handle will be monitored starting from the next daily scrape

### Viewing Summaries

- Summaries appear automatically after each daily scrape
- Recent summaries are displayed on the homepage
- Each summary includes:
  - Overall summary
  - Security alerts/hacks
  - Airdrop announcements
  - Market sentiment analysis
  - Tweet count

### Manual Trigger (Development/Testing)

You can manually trigger a scrape by visiting:

```
/api/cron/daily-scrape?secret=YOUR_CRON_SECRET
```

Or in production, use the Vercel cron dashboard to trigger manually.

## API Routes

### Handles Management

- `GET /api/handles` - Get all monitored handles
- `POST /api/handles` - Add a new handle
  ```json
  { "handle": "TheCryptoNexus" }
  ```
- `DELETE /api/handles?id={id}` - Remove a handle

### Summaries

- `GET /api/summaries` - Get recent summaries (default: last 7 days)
- `GET /api/summaries?date=2024-01-15` - Get summary for specific date
- `GET /api/summaries?limit=14` - Get last N summaries

### Cron Job

- `GET /api/cron/daily-scrape` - Trigger daily scrape (secured with CRON_SECRET)

## Project Structure

```
news_aggregator/
├── app/
│   ├── api/
│   │   ├── handles/
│   │   │   └── route.ts          # Handle management API
│   │   ├── summaries/
│   │   │   └── route.ts          # Summaries API
│   │   └── cron/
│   │       └── daily-scrape/
│   │           └── route.ts      # Cron job endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main UI
│   ├── page.module.css           # Styles
│   └── globals.css               # Global styles
├── lib/
│   ├── kv.ts                     # Vercel KV database functions
│   ├── scraper.ts                # Nitter scraping logic
│   └── summarizer.ts             # OpenAI summarization
├── .env.example                  # Environment variables template
├── vercel.json                   # Vercel configuration
├── package.json
├── tsconfig.json
└── next.config.js
```

## How It Works

1. **User adds Twitter handles** via the web interface
2. **Vercel Cron** triggers `/api/cron/daily-scrape` daily at 9 AM UTC
3. **Scraper** fetches tweets from Nitter for each handle (today's tweets only)
4. **OpenAI** analyzes all tweets and generates a structured summary
5. **Summary is saved** to Vercel KV with 30-day expiry
6. **Users view summaries** on the homepage

## Notes

- Nitter instances can be rate-limited or down. The scraper gracefully handles errors.
- Only tweets from the current day are scraped to keep summaries relevant.
- Vercel KV free tier includes 256 MB storage and 100,000 commands/month.
- OpenAI API costs vary based on usage (GPT-3.5-turbo is very affordable).
- The cron job has a 5-minute execution timeout on Vercel.

## Troubleshooting

### Scraping Issues

If Nitter is down or rate-limiting:
- Try using a different Nitter instance by modifying `lib/scraper.ts`
- Alternative instances: `nitter.poast.org`, `nitter.privacydev.net`

### KV Connection Issues

Make sure you've:
1. Created a Vercel KV database in your project
2. Linked it to your deployment
3. Pulled environment variables locally (`vercel env pull`)

### OpenAI API Errors

Check that:
1. Your API key is valid and has credits
2. The `OPENAI_API_KEY` environment variable is set correctly
3. You haven't exceeded rate limits

## License

MIT

## Contributing

Pull requests welcome! Feel free to open issues for bugs or feature requests.
