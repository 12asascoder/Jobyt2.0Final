/**
 * AI Insights Service
 *
 * Generates three AI-written insights for a job application using OpenAI GPT-4o-mini:
 *   1. fit_insights       — paragraph explaining fit/not-fit
 *   2. improvement_suggestions — newline-separated bullet list of things to improve
 *   3. rejection_reason   — single honest sentence (draft; only shown if applicant is rejected)
 *
 * Never throws. Returns null on any failure so the apply flow is never blocked.
 *
 * Profile incomplete threshold: fewer than 3 skills AND no bio text.
 */

const LOG_PREFIX = '[AIInsights]';

export interface AIInsightsResult {
  fit_insights: string;
  improvement_suggestions: string; // newline-separated, each line: "- <suggestion>"
  rejection_reason: string;
  profileIncomplete: boolean;
}

interface ApplicantContext {
  skills: string[];
  bio?: string | null;
  experience?: Array<{ title?: string; description?: string; company?: string }>;
}

interface JobContext {
  title: string;
  description: string;
  skills: string[];
}

function isProfileIncomplete(profile: ApplicantContext): boolean {
  const hasEnoughSkills = Array.isArray(profile.skills) && profile.skills.length >= 3;
  const hasBio = typeof profile.bio === 'string' && profile.bio.trim().length > 0;
  return !hasEnoughSkills && !hasBio;
}

function buildPrompt(profile: ApplicantContext, job: JobContext): string {
  const skillsText = Array.isArray(profile.skills) && profile.skills.length > 0
    ? profile.skills.join(', ')
    : 'No skills listed';

  const expText = Array.isArray(profile.experience) && profile.experience.length > 0
    ? profile.experience
        .map(e => [e.title || e.description || '', e.company || ''].filter(Boolean).join(' at '))
        .filter(Boolean)
        .join('; ')
    : 'No experience listed';

  const jobSkillsText = Array.isArray(job.skills) && job.skills.length > 0
    ? job.skills.join(', ')
    : 'Not specified';

  return `You are a senior career coach reviewing a job application.

JOB TITLE: ${job.title}
JOB REQUIRED SKILLS: ${jobSkillsText}
JOB DESCRIPTION SUMMARY: ${job.description.slice(0, 800)}

APPLICANT SKILLS: ${skillsText}
APPLICANT EXPERIENCE: ${expText}
APPLICANT BIO: ${profile.bio?.trim() || 'Not provided'}

Based on the above, respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "fit_insights": "A 2-3 sentence paragraph explaining how well this applicant fits the role. Be specific about which skills match and which are missing. Be honest but constructive.",
  "improvement_suggestions": "- First suggestion\n- Second suggestion\n- Third suggestion",
  "rejection_reason": "A single direct sentence explaining why this applicant may not be selected for this specific role."
}

Rules:
1. fit_insights: 2-3 sentences, specific, professional.
2. improvement_suggestions: 3-5 bullet points, each starting with "- ", separated by newlines.
3. rejection_reason: One sentence only. Write it as a draft for the recruiter; it will only be shown to the applicant if they are rejected.
4. Return raw JSON only. No extra text.`;
}

export const AIInsightsService = {
  async generateInsights(
    profile: ApplicantContext,
    job: JobContext,
  ): Promise<AIInsightsResult | null> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn(`${LOG_PREFIX} GEMINI_API_KEY not configured — skipping AI insights generation.`);
      return null;
    }

    const profileIncomplete = isProfileIncomplete(profile);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(profile, job),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`${LOG_PREFIX} Gemini error (${response.status}):`, err);
        return null;
      }

      const data = (await response.json()) as any;
      let content: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      if (!content) {
        console.error(`${LOG_PREFIX} Empty response from Gemini`);
        return null;
      }

      // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType
      if (content.startsWith('```json')) {
        content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (content.startsWith('```')) {
        content = content.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(content) as {
        fit_insights: string;
        improvement_suggestions: string;
        rejection_reason: string;
      };

      if (!parsed.fit_insights || !parsed.improvement_suggestions || !parsed.rejection_reason) {
        console.error(`${LOG_PREFIX} Malformed AI response — missing fields:`, parsed);
        return null;
      }

      return {
        fit_insights: String(parsed.fit_insights).trim(),
        improvement_suggestions: String(parsed.improvement_suggestions).trim(),
        rejection_reason: String(parsed.rejection_reason).trim(),
        profileIncomplete,
      };
    } catch (err) {
      console.error(`${LOG_PREFIX} Generation failed:`, err);
      return null;
    }
  },
};
