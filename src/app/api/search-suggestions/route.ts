import { NextResponse, NextRequest } from 'next/server';
import OpenAI from 'openai';
import { MONGODB } from "@/constants/auth";
import { getClientIp } from "@/utils/getClientIp";
import { connectDB } from "@/lib/mongodb";

// Ensure your OpenAI API key is set in your .env file
// OPENAI_API_KEY=your_api_key_here
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate Limiting Config
const SUGGESTION_LIMIT = 20; // Max 20 requests per window per IP
const SUGGESTION_WINDOW_MS = 60 * 1000; // 1 minute window

export async function POST(request: NextRequest) {
  if (!openai.apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  const clientIp = getClientIp(request);

  // --- Rate Limiting Check ---
  if (clientIp) {
    try {
      const db = await connectDB();
      const rateLimitCollection = db.collection(MONGODB.collections.rateLimits);

      const windowStart = new Date(Date.now() - SUGGESTION_WINDOW_MS);

      const requestCount = await rateLimitCollection.countDocuments({
        ip: clientIp,
        route: '/api/search-suggestions',
        timestamp: { $gte: windowStart },
      });

      if (requestCount >= SUGGESTION_LIMIT) {
        console.warn(`Rate limit exceeded for IP ${clientIp} on /api/search-suggestions`);
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }

      // Log the request for rate limiting
      await rateLimitCollection.insertOne({
        ip: clientIp,
        route: '/api/search-suggestions',
        timestamp: new Date(),
      });

    } catch (dbError) {
      console.error("Rate limiting database error:", dbError);
      // Decide if you want to proceed or block on DB error
      // Proceeding might open up to abuse if DB is down
      // Blocking might deny service if DB is temporarily unavailable
      // Let's block for safety:
      return NextResponse.json({ error: 'Internal server error (rate limit check)' }, { status: 500 });
    }
  } else {
      console.warn("Could not determine client IP for rate limiting suggestions.");
      // Optional: Block requests where IP is unknown, or proceed with caution
  }
  // --- End Rate Limiting Check ---

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json({ suggestions: [] }); // No suggestions for short queries
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or "gpt-4" if you prefer
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping users search for events. Given a partial search query, provide 3-5 relevant suggestions or completions. Focus on event types, categories, locations, or potential event names. Keep suggestions concise. Return suggestions as a JSON array of strings within a JSON object like {"suggestions": ["...", "..."]}. Example query: "tech conf" -> {"suggestions": ["tech conference", "tech conference downtown", "AI technology conference"]} Example query: "music fest" -> {"suggestions": ["music festival", "local music festival", "jazz music festival"]} Example query: "art" -> {"suggestions": ["art exhibition", "art gallery opening", "street art workshop"]}`
        },
        {
          role: "user",
          content: `Generate search suggestions for the query: "${query}"`
        }
      ],
      max_tokens: 60,
      n: 1,
      stop: null,
      temperature: 0.5, // Lower temperature for more predictable suggestions
      response_format: { type: "json_object" } // Request JSON output
    });

    let suggestions: string[] = [];
    if (completion.choices[0].message?.content) {
      try {
        // Assuming the AI returns a JSON object like { "suggestions": ["...", "..."] }
        const content = JSON.parse(completion.choices[0].message.content);
        if (content && Array.isArray(content.suggestions)) {
           suggestions = content.suggestions.filter((s: unknown): s is string => typeof s === 'string');
        } else {
            console.warn("OpenAI response content.suggestions was not an array:", content);
        }
      } catch (parseError) {
        console.error("Failed to parse OpenAI suggestions JSON:", parseError);
        console.error("Raw content:", completion.choices[0].message.content);
        // Attempt to extract suggestions even if JSON is malformed (basic example)
        const rawContent = completion.choices[0].message.content;
        const potentialSuggestions = rawContent.match(/"(.*?)"/g); // Try finding quoted strings
        if (potentialSuggestions) {
            suggestions = potentialSuggestions.map(s => s.replace(/"/g, '')).slice(0, 5); // Limit recovery
        }
      }
    }

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error("Error fetching OpenAI suggestions:", error);
    let errorMessage = "Failed to fetch suggestions";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 