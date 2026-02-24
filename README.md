# Study-Kit-Generator

AI-powered study kit generator that creates flashcards, Cornell notes, mind maps, and vector chunks from your study materials.

## Features

- 📝 Cornell Notes generation
- 🎴 Interactive Flashcards
- 🧠 Mind Maps
- 📊 Vector Chunks for efficient learning

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key (optional, for AI-powered generation)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Poorvajain2005/Study-Kit-Generator.git
cd Study-Kit-Generator
```

2. Install dependencies
```bash
npm install
```

3. Configure Supabase

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get your credentials from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API

4. (Optional) Add Gemini API Key

For AI-powered study kit generation, add to your Supabase Edge Function secrets:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

5. Run the development server
```bash
npm run dev
```

## Tech Stack

- React + TypeScript
- Vite
- Supabase
- Tailwind CSS
- Lucide Icons
