import { AppError } from '../utils/appError';
import { PromptTemplatesService } from './promptTemplates.service';

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

    const systemPrompt = PromptTemplatesService.renderTemplate('job_parsing', {
      rawText,
    });

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
