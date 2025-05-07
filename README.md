# Bluesky Listings

A Craigslist-like application built on the AT Protocol that allows Bluesky users to log in and create listings.

## Features

- Authentication with Bluesky credentials
- Create, view, and search listings
- User profiles
- Categories for different types of listings
- Responsive design with Tailwind CSS and shadcn/ui

## Tech Stack

- Next.js (App Router)
- AT Protocol / Bluesky API
- Tailwind CSS
- shadcn/ui components
- AI SDK for enhanced features

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

### GitHub Repository

1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com/) and sign in to your account
   - Click the '+' icon in the top-right corner and select 'New repository'
   - Name your repository `bluesky-listings`
   - Add an optional description
   - Choose the repository visibility (public or private)
   - Do NOT initialize with README, .gitignore, or license files
   - Click 'Create repository'

2. Push your local repository to GitHub:
   ```bash
   git branch -M main
   git push -u origin main
   ```

   Note: The remote URL has been updated to: https://github.com/scohoe/bluesky-listings

### Vercel Deployment

1. Sign up for a free account at [Vercel](https://vercel.com)
2. From the Vercel dashboard, click "Add New" > "Project"
3. Select the GitHub repository `scohoe/bluesky-listings`
   - You may need to connect your GitHub account if you haven't already
4. Vercel will automatically detect Next.js and configure the build settings
5. Click "Deploy" to start the deployment process
6. Once deployed, your app will be live at `https://bluesky-listings.vercel.app` (or a similar URL assigned by Vercel)
7. You can configure a custom domain in the Vercel project settings if desired

## License

MIT