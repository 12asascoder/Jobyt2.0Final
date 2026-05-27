import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const models = await client.models.list();
  for await (const m of models) {
    if (m.name?.includes('embed')) console.log(m.name, (m as any).supportedGenerationMethods);
  }
}
run();
