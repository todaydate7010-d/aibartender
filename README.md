# AI Bartender

A polished, mobile-first cocktail recommendation MVP built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, and Lucide React.

## Run locally

```bash
npm install
npm run dev
```

The recommendation engine is intentionally mock-based. Cocktail data lives in `src/data/cocktails.ts`, making it straightforward to replace with an API later.

## Run locally with the T1 API

The `/api/agent` server function is not handled by Vite alone. To run the app and the Vercel server function together:

```bash
npm run dev:vercel
```

Open the local URL shown by Vercel, usually `http://localhost:3000`. Make sure `OPENAI_API_KEY` is available to the Vercel local environment before using the natural-language search.

## Deploy with Vercel

1. Open Vercel and choose **Add New Project**.
2. Import `5ena9/AI-Bartender` from GitHub.
3. Keep the detected Vite settings and click **Deploy**.

The included `vercel.json` uses `npm run build` and publishes the generated `dist` folder.
