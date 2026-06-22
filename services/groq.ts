import Groq from 'groq-sdk';
import * as SecureStore from 'expo-secure-store';

const SYSTEM_PROMPT = `You are a background e-reader assistant. Analyze the provided page of text. Return a strict JSON object with exactly three keys. Do not include any markdown formatting, backticks, or conversational text.

Expected JSON Schema:
{
  "summary": "A 2-sentence breakdown of key narrative/thematic progression on this specific page.",
  "uncommon_words": [
    {"word": "example", "definition": "simple contextual definition", "grade_level": "High School / Grade 11"}
  ],
  "contextual_insights": [
    {"subject": "Name/Place/Concept", "insight": "A brief explanation of historical, local, or specific context mentioned on this page that isn't widely known."}
  ]
}`;

export interface PageInsight {
  summary: string;
  uncommon_words: Array<{ word: string; definition: string; grade_level: string }>;
  contextual_insights: Array<{ subject: string; insight: string }>;
}

/**
 * Communicates directly with Groq to fetch structured page data.
 * Zero data leaves the machine except direct requests to the API gateway.
 */
export async function fetchPageInsights(pageText: string): Promise<PageInsight | null> {
  try {
    // Retrieve the user's local API key securely
    const apiKey = await SecureStore.getItemAsync('groq_api_key');
    if (!apiKey) {
      console.warn("Groq API Key missing. Please configure it in Settings.");
      return null;
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this page text:\n\n${pageText}` }
      ],
      temperature: 0.1, // Highly deterministic parsing execution
    });

    const jsonText = completion.choices[0]?.message?.content;
    if (!jsonText) return null;

    return JSON.parse(jsonText) as PageInsight;
  } catch (error) {
    console.error("Error connecting to Groq processing pipeline:", error);
    return null;
  }
}