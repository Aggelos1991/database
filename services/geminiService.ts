import OpenAI from "openai";
import { FilterState, Entity } from "../types";

const getOpenAIKey = (): string | undefined => {
  // 1. Check for standard OpenAI environment variables first
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (process.env.VITE_OPENAI_API_KEY) return process.env.VITE_OPENAI_API_KEY;
  if (process.env.REACT_APP_OPENAI_API_KEY) return process.env.REACT_APP_OPENAI_API_KEY;

  // 2. Fallback to generic API_KEY only if it looks like an OpenAI key (starts with sk-)
  // This prevents accidentally using a Gemini/Google key (which often starts with AIza...)
  const genericKey = process.env.API_KEY;
  if (genericKey && genericKey.trim().startsWith('sk-')) {
    return genericKey;
  }

  return undefined;
};

const parseFilterWithOpenAI = async (query: string): Promise<FilterState | null> => {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    console.error("OpenAI API Key not found or invalid. Please ensure OPENAI_API_KEY is set in your .env file and starts with 'sk-'.");
    return null;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
  
  // Context for relative dates
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayISO = now.toISOString().split('T')[0];
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Context for Entity mapping
  const knownEntities = Object.values(Entity).join(", ");

  const systemPrompt = `
    You are an intelligent search parser for an Accounts Payable dashboard.
    
    Context:
    - Today is ${dayName}, ${todayISO}.
    - Known Entities: [${knownEntities}]

    Instructions:
    1. Extract search filters from the user query.
    
    2. ENTITY MAPPING: 
       - If the user mentions "Andalusia", map to "IKOS ANDALUSIA".
       - If "Porto" or "Petro", map to "IKOS PORTO PETRO".
       - If "Marbella", map to "IKOS MARBELLA".
       - If "SHM" or "Spanish", map to "IKOS SPANISH HOTEL MANAGEMENT".
       - Try to map to the Known Entities list exactly.

    3. DATE LOGIC (Crucial):
       - Explicit Year/Month: Set 'year' and 'month' (1-12).
       - Relative Ranges ("Last week", "Yesterday", "Last 7 days"): 
         - CALCULATE the specific 'startDate' and 'endDate' (YYYY-MM-DD) based on Today being ${todayISO}.
         - Example: If today is 2024-05-10 and user says "last week", start might be 2024-04-29 and end 2024-05-05.
         - Do NOT set year/month if using start/end date ranges, unless specifically asked.
       - "Recently" or "Newest": usually implies sorting, but you can set a startDate to 7 days ago.

    4. VENDOR: Extract the core vendor name (e.g. "Tesla" from "Tesla Energy").

    Return a JSON object with the following keys (use null if not found):
    - vendor: string | null
    - entity: string | null
    - year: number | null
    - month: number | null
    - document_type: string | null
    - startDate: string | null (YYYY-MM-DD)
    - endDate: string | null (YYYY-MM-DD)
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    
    if (content) {
        return JSON.parse(content) as FilterState;
    }
    return null;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return null;