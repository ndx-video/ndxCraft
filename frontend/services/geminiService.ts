import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAsciiDoc = async (prompt: string, context: string = ""): Promise<string> => {
  try {
    const client = getClient();
    const model = "gemini-2.5-flash"; // Fast and capable for text editing

    let fullPrompt = `You are an expert technical writer and AsciiDoc specialist.
    Your task is to generate or improve AsciiDoc content based on the user's request.
    
    User Request: ${prompt}
    
    ${context ? `Current Document Context:\n${context}\n` : ''}
    
    Output ONLY the raw AsciiDoc content. Do not include markdown code fences (like \`\`\`asciidoc) unless specifically asked to explain code. Do not add conversational filler.`;

    const response = await client.models.generateContent({
      model: model,
      contents: fullPrompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const fixGrammar = async (text: string): Promise<string> => {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Fix the grammar and improve the clarity of the following AsciiDoc text. Maintain all AsciiDoc syntax/formatting exactly as is. Output ONLY the corrected text.\n\nText:\n${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
