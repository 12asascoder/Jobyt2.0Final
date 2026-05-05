import { AppError } from '../utils/appError';

export interface AIParsedJob {
  title: string;
  companyName: string;
  description: string;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  skills: string[];
}

export const AiParserService = {
  /**
   * Passes raw scraped text into OpenAI to structure it into the specific Job Schema.
   */
  async parseJobText(rawText: string): Promise<AIParsedJob> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    const systemPrompt = `
You are an expert HR data extraction AI. You will be provided with raw text scraped from a job listing webpage.
Extract the relevant job details and output them STRICTLY as a JSON object matching this schema:
{
  "title": "Job Title (string)",
  "companyName": "Company Name (string)",
  "description": "A well-formatted HTML or Markdown description of the job, including responsibilities and requirements (string)",
  "location": "Job location if found, e.g., 'Remote', 'New York, NY', else null",
  "salary_min": integer or null (e.g., 50000),
  "salary_max": integer or null (e.g., 80000),
  "skills": ["Array", "Of", "Relevant", "Technical", "Or", "Soft", "Skills"]
}
Rules:
1. ONLY return the JSON object, absolutely no markdown formatting blocks (do not wrap in \`\`\`json).
2. If a field like salary or location is missing, use null.
3. Clean up the description to remove header/footer website navigation links or cookie consent text. Focus purely on the job description.
4. If you cannot determine the company name, return "External Company".
`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' depending on availability
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText }
          ],
          temperature: 0.1, // Low temperature for deterministic extraction
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI Error:', errorData);
        throw new AppError('AI Parsing failed due to provider error', 502);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      try {
        const parsed: AIParsedJob = JSON.parse(content);
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse AI output as JSON:', content);
        throw new AppError('AI returned malformed data', 500);
      }

    } catch (error) {
      console.error('AiParserService error:', error);
      throw error;
    }
  }
};
