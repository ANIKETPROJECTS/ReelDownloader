# FastVideoSaves - Instagram Reel Downloader

## Overview
A web application that allows users to download Instagram Reels by pasting a public Instagram URL. The app processes the URL server-side and returns a downloadable video link.

## Architecture
- **Frontend**: React + TypeScript with Vite, using TailwindCSS and shadcn/ui components
- **Backend**: Express.js server (TypeScript) running on port 5000
- **Storage**: In-memory storage (no external database required)
- **Package**: `instagram-url-direct` for resolving Instagram reel download URLs

## Project Structure
- `client/` - React frontend source
- `server/` - Express backend (index.ts, routes.ts, storage.ts, vite.ts)
- `shared/` - Shared types and route definitions (schema.ts, routes.ts)
- `api/` - Netlify/Vercel serverless function entry point
- `script/` - Build scripts

## Running the App
- Development: `npm run dev` (starts Express + Vite dev server on port 5000)
- Build: `npm run build`
- Production: `npm run start`

## Key Features
- Paste any public Instagram Reel URL to extract a direct download link
- Server-side proxy endpoint (`/api/proxy`) to stream videos avoiding CORS
- In-memory logging of download attempts

## Environment
- Node.js 20
- Port: 5000 (mapped to external port 80)
