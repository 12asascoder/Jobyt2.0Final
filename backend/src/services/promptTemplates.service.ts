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
   * Configurable and structured interview question generation
   */
  INTERVIEW_SESSION_QUESTIONS: {
    name: 'interview_session_questions',
    template: `You are an elite technical interviewer. Generate exactly {{questionCount}} diverse interview questions for a candidate applying for the role: "{{roleTitle}}".

Job Description context (if any):
"{{jobDescription}}"

Guidelines:
1. Generate exactly {{questionCount}} questions.
2. For each question, map it to a specific category. The category MUST be exactly one of: 'behavioral', 'situational', or 'technical'. Do not output any other category value.
3. Keep the questions focused on assessing the candidate's fit for the role.
4. Include a list of expected topics that a strong response should cover.
5. Return output STRICTLY as a valid JSON object matching the required schema. Do not wrap in markdown code blocks.

JSON Schema Required:
{
  "questions": [
    {
      "questionText": "Question string",
      "category": "technical" | "behavioral" | "situational",
      "expectedTopics": ["topic1", "topic2"]
    }
  ]
}`,
    variables: ['roleTitle', 'jobDescription', 'questionCount'],
    description: 'Generate configurable, structured interview questions categorized into behavioral, situational, or technical categories',
  } as PromptTemplate,

  /**
   * Evaluate a candidate response against 5 rubric criteria
   */
  INTERVIEW_RESPONSE_EVALUATION: {
    name: 'interview_response_evaluation',
    template: `You are an expert technical recruiter and AI interviewer evaluator. Evaluate the candidate's response to the interview question below.

Question Text:
"{{questionText}}"

Candidate Response:
"{{candidateResponse}}"

Evaluation Rubric Guidelines:
Rate the response from 0 to 100 on exactly these five criteria:
1. communicationClarity: clarity, structured presentation, vocabulary, and articulation.
2. contentRelevance: correctness, address of requested constraints, logic, and precision.
3. responseStructure: formatting, outline flow, logical progressions, and conclusions.
4. depthOfKnowledge: technical depth, familiarity with frameworks, trade-offs, and edge-cases.
5. confidenceIndicators: assertive tone, professional posture in phrasing, and conviction.

Additionally, provide a descriptive qualitative feedback (feedbackText) and specific suggestions for improvement (suggestedImprovements).
Return the result strictly as a valid JSON object matching the required schema. Do not wrap in markdown code blocks.

JSON Schema Required:
{
  "scores": {
    "communicationClarity": number (0-100),
    "contentRelevance": number (0-100),
    "responseStructure": number (0-100),
    "depthOfKnowledge": number (0-100),
    "confidenceIndicators": number (0-100)
  },
  "feedbackText": "String feedback...",
  "suggestedImprovements": "String improvements..."
}`,
    variables: ['questionText', 'candidateResponse'],
    description: 'Evaluate a candidate response against 5 rubric criteria, providing scores and constructive feedback',
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
      this.INTERVIEW_QUESTIONS,
      this.SKILL_GAP_ANALYSIS,
      this.INTERVIEW_SESSION_QUESTIONS,
      this.INTERVIEW_RESPONSE_EVALUATION,
    ];
  },

  /**
   * Get names of all available templates
   */
  getAvailableTemplates(): string[] {
    return this.getAllTemplates().map((t) => t.name);
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
