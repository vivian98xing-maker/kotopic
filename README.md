# Kotopic ことぴく

A web application that helps Japanese language learners by allowing them to upload images, identify items in the images, learn their Japanese translations, and practice with conversational sentences.

## Features

- Image upload functionality
- AI-powered item identification using OpenAI Vision
- Japanese word translations (romaji and kanji/hiragana)
- Generation of relevant conversational sentences

## Getting Started

First, obtain an API key from [QWen (Alibaba Cloud)](https://dashscope.aliyuncs.com/).

Create a local environment file:

```bash
cp .env.example .env.local
```

Then replace `QWEN_API_KEY` in `.env.local` with your real key.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Upload an image and click "Analyze Image" to get results.

## Open From Other Devices Nearby

To test from a phone, tablet, or another computer on the same Wi-Fi network:

```bash
npm run dev:network
```

Find this computer's local IP address, then open this address on the other device:

```txt
http://YOUR_LOCAL_IP:3000
```

For example, if your local IP is `192.168.1.25`, open `http://192.168.1.25:3000`.

## Publish Online

This app needs a Node.js-capable host because `/app/api/analyze/route.ts` calls the QWen API from the server. Static-only hosting is not enough for the image analysis feature.

Recommended hosting options:

- Vercel, simplest for a Next.js app
- Render, Railway, Fly.io, or another Node.js host
- Your own server running `npm run build` and `npm run start`

When deploying, add these environment variables in the host's dashboard:

```txt
QWEN_API_KEY=your-real-secret-key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-vl-max
```

Do not commit `.env.local`; it is already ignored by Git.

For a normal Node.js deployment, the production commands are:

```bash
npm install
npm run build
npm run start
```

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- QWen API (Alibaba Cloud)
