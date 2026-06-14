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
   * Resume Draft Generation Template
   * Used for producing a polished candidate resume structure from profile data
   */
  RESUME_GENERATION: {
    name: 'resume_generation',
    template: `You are a professional resume writer. Convert the candidate profile data into a polished resume draft and output only valid JSON.

Candidate Name: {{name}}
Bio: {{bio}}
Skills: {{skills}}
Experience: {{experience}}
Education: {{education}}
Links: {{links}}

Output a JSON object with this schema:
{
  "summary": "Concise professional summary",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Role Title",
      "dates": "Dates or period",
      "description": "One or two bullet-style sentences describing the main outcome and responsibilities."
    }
  ],
  "education": [
    {
      "institution": "Institution name",
      "degree": "Degree or program",
      "dates": "Dates or graduation year",
      "description": "Optional short description of coursework or honors."
    }
  ],
  "contact": {
    "email": "Email if available or null",
    "phone": "Phone number if available or null",
    "linkedin": "LinkedIn URL if available or null",
    "github": "GitHub URL if available or null",
    "portfolio": "Portfolio URL if available or null"
  }
}

Return the JSON object only, with no markdown wrappers and no extra text.`,
    variables: ['name', 'bio', 'skills', 'experience', 'education', 'links'],
    description: 'Generate a structured resume draft from profile data',
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
  /**
   * Skill Target Plan Template
   * Used for determining what skills to emphasize before tailoring
   */
  SKILL_TARGET_PLAN: {
    name: 'skill_target_plan',
    template: `Build a concise skill target plan for tailoring this resume to the job.
Return ONLY a JSON object. Do not rewrite the resume.

Rules:
1. Prefer required and preferred JD skills.
2. Include existing resume skills that are highly relevant to the JD.
3. You may include JD skills that are missing from the resume skills list.
4. Do not include skills unrelated to the JD.
5. Do not include certifications.

Existing resume skills:
{{existingSkills}}

JD keywords and skills:
{{jobKeywords}}

Job Description:
{{jobDescription}}

Resume JSON:
{{originalResume}}

Output this exact JSON format:
{
  "target_skills": [
    {
      "skill": "skill name",
      "reason": "why this skill should be emphasized"
    }
  ],
  "strategy_notes": "brief notes for the next editing pass"
}`,
    variables: ['existingSkills', 'jobKeywords', 'jobDescription', 'originalResume'],
    description: 'Determine what skills to emphasize for a specific job',
  } as PromptTemplate,

  /**
   * Diff-Based Resume Tailoring Template
   * Applies targeted changes to an existing resume
   */
  RESUME_TAILORING: {
    name: 'resume_tailoring',
    template: `Given this resume and job description, output a JSON object with targeted changes to better align the resume with the job.

CRITICAL TRUTHFULNESS RULES - NEVER VIOLATE:
1. DO NOT add any skill, tool, technology, or certification that is not explicitly mentioned in the original resume (unless it's in the verified skill targets)
2. DO NOT invent numeric achievements (e.g., "increased by 30%") unless they exist in original
3. DO NOT add company names, product names, or technical terms not in the original
4. DO NOT upgrade experience level (e.g., "Junior" -> "Senior")
5. DO NOT add languages, frameworks, or platforms the candidate hasn't used
6. DO NOT extend employment dates or change timelines. Copy date ranges exactly as they appear.
7. Preserve factual accuracy - only use information provided by the candidate
8. NEVER remove existing skills, certifications, languages, or awards. You may reorder by relevance, but every original item must remain.

RULES:
1. Only modify content; never change names, companies, dates, institutions, or degrees
2. Do not invent metrics or achievements not supported by the original resume text
3. Do not add new work entries, education entries, or project entries
4. {{strategyInstruction}}
5. Each change MUST include the original text (copied exactly) so it can be verified
6. For each change, explain WHY it helps match the job description
7. Do not use em dash characters
8. Keep changes minimal and targeted; do not rewrite content that already aligns well
9. Preserve original capitalization, especially for proper nouns, technical terms (e.g., REST, API, AWS), and acronyms.

PATHS you can target:
- "summary" — the resume summary text
- "experience[i].description[j]" — a specific bullet (i = entry index, j = bullet index)
- "experience[i].description" — append a new bullet (action: "append")
- "education[i].description" — the education entry's description text (replace only)
- "skills" — reorder the skills list (action: "reorder") or add one verified skill (action: "add_skill")

Keywords to emphasize:
{{jobKeywords}}

Verified skill targets:
{{skillTargets}}

Job Description:
{{jobDescription}}

Original Resume:
{{originalResume}}

Output this exact JSON format, nothing else:
{
  "changes": [
    {
      "path": "experience[0].description[1]",
      "action": "replace",
      "original": "the exact original text at this path",
      "value": "the improved text",
      "reason": "why this change helps"
    },
    {
      "path": "skills",
      "action": "add_skill",
      "original": null,
      "value": "verified skill target missing from the skills list",
      "reason": "added verified JD skill for review"
    }
  ],
  "strategy_notes": "brief summary of the tailoring approach"
}`,
    variables: ['strategyInstruction', 'jobKeywords', 'skillTargets', 'jobDescription', 'originalResume'],
    description: 'Tailor resume content via targeted diffs without credential fabrication',
  } as PromptTemplate,

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
      this.RESUME_GENERATION,
      this.RESUME_TAILORING,
      this.INTERVIEW_QUESTIONS,
      this.SKILL_GAP_ANALYSIS,
      this.SKILL_TARGET_PLAN,
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
