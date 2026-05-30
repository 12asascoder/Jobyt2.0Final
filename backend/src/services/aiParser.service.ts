import { AppError } from '../utils/appError';
import { PromptTemplatesService } from './promptTemplates.service';
import { AIService } from './ai.service';
import { aiConfig } from '../config/ai.config';

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
   * Passes raw scraped text into AI to structure it into the specific Job Schema.
   */
  async parseJobText(rawText: string): Promise<AIParsedJob> {
    const prompt = PromptTemplatesService.renderTemplate('job_parsing', {
      rawText,
    });

    if (aiConfig.isConfigured) {
      const parsed = await AIService.generateJSON<AIParsedJob>(prompt);
      if (parsed) {
        return parsed;
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError('AI provider is not configured', 500);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
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
  },
};
