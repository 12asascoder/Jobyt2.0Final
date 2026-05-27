import { ATSService } from './ats.service';
import { AiParserService } from './aiParser.service';
import { PromptTemplatesService } from './promptTemplates.service';
import { AppError } from '../utils/appError';

export interface AIOrchestratorRequest {
  type: 'ats_analysis' | 'resume_processing' | 'matching_workflow';
  data: Record<string, any>;
}

export interface AIOrchestratorResponse {
  success: boolean;
  result: any;
  metadata?: {
    service: string;
    processingTime: number;
    timestamp: Date;
  };
}

/**
 * AI Orchestrator Service
 *
 * Central orchestration layer for AI-related tasks:
 * - ATS analysis
 * - Resume processing
 * - Candidate/job matching workflows
 *
 * Routes requests to appropriate AI services and manages prompt templates.
 */
export const AIOrchestratorService = {
  /**
   * Main orchestration method that routes AI requests to appropriate handlers
   */
  async processRequest(request: AIOrchestratorRequest): Promise<AIOrchestratorResponse> {
    const startTime = Date.now();

    try {
      let result: any;
      let serviceName: string;

      switch (request.type) {
        case 'ats_analysis':
          result = await this.handleATSAnalysis(request.data);
          serviceName = 'ATSService';
          break;

        case 'resume_processing':
          result = await this.handleResumeProcessing(request.data);
          serviceName = 'AiParserService';
          break;

        case 'matching_workflow':
          result = await this.handleMatchingWorkflow(request.data);
          serviceName = 'MatchingWorkflow';
          break;

        default:
          throw new AppError(`Unsupported AI request type: ${request.type}`, 400);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        result,
        metadata: {
          service: serviceName,
          processingTime,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      console.error('[AIOrchestrator] Processing error:', error);
      throw error;
    }
  },

  /**
   * Handle ATS analysis requests
   */
  async handleATSAnalysis(data: any) {
    const { resumeData, jobData } = data;

    if (!resumeData || !jobData) {
      throw new AppError('ATS analysis requires resumeData and jobData', 400);
    }

    // Use existing ATSService for scoring
    return ATSService.calculateATSScore(resumeData, jobData);
  },

  /**
   * Handle resume processing requests
   */
  async handleResumeProcessing(data: any) {
    const { rawText } = data;

    if (!rawText) {
      throw new AppError('Resume processing requires rawText', 400);
    }

    // Use existing AiParserService for job text parsing
    return AiParserService.parseJobText(rawText);
  },

  /**
   * Handle candidate/job matching workflow requests
   */
  async handleMatchingWorkflow(data: any) {
    const { userSkills, jobSkills, resumeText, jobDescription } = data;

    if (!userSkills || !jobSkills) {
      throw new AppError('Matching workflow requires userSkills and jobSkills', 400);
    }

    // Calculate basic skill match score
    const skillMatch = this.calculateSkillMatch(userSkills, jobSkills);

    // If resume and job description provided, get detailed ATS score
    let atsScore = null;
    if (resumeText && jobDescription) {
      atsScore = ATSService.calculateATSScore(
        {
          skills: userSkills,
          experienceText: resumeText,
          fullText: resumeText,
        },
        {
          skills: jobSkills,
          description: jobDescription,
        }
      );
    }

    return {
      skillMatch,
      atsScore,
      recommendations: this.generateMatchingRecommendations(skillMatch, atsScore),
    };
  },

  /**
   * Calculate basic skill match percentage
   */
  calculateSkillMatch(userSkills: string[], jobSkills: string[]): number {
    if (!jobSkills.length) return 0;

    const matchedSkills = jobSkills.filter(jobSkill =>
      userSkills.some(userSkill =>
        userSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );

    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  },

  /**
   * Generate matching recommendations based on scores
   */
  generateMatchingRecommendations(skillMatch: number, atsScore: any) {
    const recommendations = [];

    if (skillMatch < 50) {
      recommendations.push('Consider upskilling in required technologies');
    }

    if (atsScore && atsScore.totalScore < 60) {
      recommendations.push('Review and optimize resume content');
      recommendations.push('Highlight relevant experience more prominently');
    }

    if (skillMatch >= 80 && (!atsScore || atsScore.totalScore >= 70)) {
      recommendations.push('Strong match - consider applying');
    }

    return recommendations;
  },

  /**
   * Get available AI task types
   */
  getAvailableTaskTypes(): string[] {
    return ['ats_analysis', 'resume_processing', 'matching_workflow'];
  },

  /**
   * Validate AI request structure
   */
  validateRequest(request: AIOrchestratorRequest): boolean {
    if (!request.type || !this.getAvailableTaskTypes().includes(request.type)) {
      return false;
    }

    if (!request.data || typeof request.data !== 'object') {
      return false;
    }

    return true;
  },
};