/**
 * Prompt Templates Service
 *
 * Centralized management of reusable AI prompts for:
 * - ATS scoring
 * - Resume review
 * - Skill/job matching
 *
 * Eliminates prompt duplication and provides consistent prompting.
 */

export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

export const PromptTemplatesService = {
  /**
   * ATS Scoring Prompt Template
   * Used for detailed resume-job matching analysis
   */
  ATS_SCORING: {
    name: 'ats_scoring',
    template: `You are a strict, senior technical recruiter AI parsing a resume string against a job description.
You must output ONLY valid JSON without any markdown formatting.
Analyze the exact raw resume text and job description provided below.

Calculate based exactly on real industry expectations:
1. keywordDensity: top 3 most repeated tech skill keywords and their frequencies in the resume.
2. explanation: highly specific 2-sentence rationale for the overall resume strength compared to the job description.
3. feedback: { "missingSections": [], "weakAreas": [], "improvements": ["Actionable suggestion 1", "Suggestion 2"] }
4. qualityScore: 0 to 100 purely based on grammar, wording, length optimization, and detail. Deduct heavily for duplicate filler content.
5. rolePrediction: The best job title the candidate actually deserves based solely on the resume.
6. experience: Calculate total years/months from chronological dates found in the resume (e.g. "5 Years 2 Months"). Return "0 Years" if none found.

Resume Text: "{{resumeText}}"
Job Description: "{{jobDescription}}"

JSON schema required:
{
  "keywordDensity": { "keywordString": number },
  "explanation": string,
  "feedback": { "missingSections": [string], "weakAreas": [string], "improvements": [string] },
  "qualityScore": number,
  "rolePrediction": string,
  "experience": string
}`,
    variables: ['resumeText', 'jobDescription'],
    description: 'Detailed ATS analysis with LLM enrichment for resume-job matching',
  } as PromptTemplate,

  /**
   * Job Parsing Prompt Template
   * Used for extracting structured job data from raw text
   */
  JOB_PARSING: {
    name: 'job_parsing',
    template: `You are an expert HR data extraction AI. You will be provided with raw text scraped from a job listing webpage.
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

Raw Job Text: "{{rawText}}"`,
    variables: ['rawText'],
    description: 'Extract structured job data from raw scraped text',
  } as PromptTemplate,

  /**
   * Interview Questions Generation Template
   * Used for generating role-specific interview questions
   */
  INTERVIEW_QUESTIONS: {
    name: 'interview_questions',
    template: `You are an expert technical interviewer. Generate 5 thoughtful, role-specific interview questions for a {{role}} position.

Required Skills: {{skills}}

Guidelines:
- Questions should assess both technical proficiency and problem-solving ability
- Include a mix of conceptual and practical questions
- Focus on the candidate's experience with the required skills
- Questions should be appropriate for mid-level candidates
- Return only the questions as a JSON array of strings

Generate exactly 5 questions that would help evaluate a candidate's fit for this role.`,
    variables: ['role', 'skills'],
    description: 'Generate role-specific interview questions based on job requirements',
  } as PromptTemplate,

  /**
   * Skill Gap Analysis Template
   * Used for analyzing skill gaps between user and job requirements
   */
  SKILL_GAP_ANALYSIS: {
    name: 'skill_gap_analysis',
    template: `Analyze the skill gap between a candidate's current skills and job requirements.

Candidate Skills: {{userSkills}}
Required Job Skills: {{requiredSkills}}

Provide analysis in the following JSON format:
{
  "matchedSkills": ["skills that match"],
  "missingSkills": ["skills that are missing"],
  "skillGapPercentage": number (0-100),
  "recommendations": ["specific learning recommendations"],
  "prioritySkills": ["most important missing skills to learn first"]
}

Focus on practical, actionable recommendations for skill development.`,
    variables: ['userSkills', 'requiredSkills'],
    description: 'Analyze skill gaps and provide learning recommendations',
  } as PromptTemplate,

  /**
   * Get a prompt template by name
   */
  getTemplate(name: string): PromptTemplate | null {
    const templates = this.getAllTemplates();
    return templates.find(template => template.name === name) || null;
  },

  /**
   * Get all available prompt templates
   */
  getAllTemplates(): PromptTemplate[] {
    return [
      this.ATS_SCORING,
      this.JOB_PARSING,
      this.INTERVIEW_QUESTIONS,
      this.SKILL_GAP_ANALYSIS,
    ];
  },

  /**
   * Render a template with provided variables
   */
  renderTemplate(templateName: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let rendered = template.template;

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Check for any remaining unsubstituted variables
    const remainingVars = rendered.match(/\{\{(\w+)\}\}/g);
    if (remainingVars) {
      const missingVars = [...new Set(remainingVars.map(v => v.slice(2, -2)))];
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return rendered;
  },

  /**
   * Validate that all required variables are provided for a template
   */
  validateVariables(templateName: string, variables: Record<string, any>): boolean {
    const template = this.getTemplate(templateName);
    if (!template) {
      return false;
    }

    return template.variables.every(varName => Object.prototype.hasOwnProperty.call(variables, varName));
  },
};