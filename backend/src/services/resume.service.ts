import { ResumeDeleteResult, ResumeListItem, ResumeModel } from '../models/resume.model';
import { StorageService } from './storage.service';
import { withTransaction } from '../utils/transaction';

export const ResumeService = {
  audit(event: string, payload: Record<string, unknown>) {
    // Lightweight audit trail; can be replaced by persistent event logging later.
    console.info('[AUDIT]', event, payload);
  },

  async getUserResumes(userId: string): Promise<ResumeListItem[]> {
    return ResumeModel.findByUserId(userId);
  },

  async getDefaultResume(userId: string): Promise<ResumeListItem> {
    const resume = await ResumeModel.findDefaultByUserId(userId);
    if (!resume) {
      throw Object.assign(new Error('No default resume found'), {
        statusCode: 404,
        code: 'DEFAULT_RESUME_NOT_FOUND',
      });
    }

    const { user_id: _omitUserId, updated_at: _omitUpdatedAt, ...rest } = resume;
    return rest;
  },

  async setDefaultResume(userId: string, resumeId: string): Promise<ResumeListItem> {
    const resume = await withTransaction(async (client) => {
      return ResumeModel.setDefaultResume(userId, resumeId, client);
    });
    ResumeService.audit('resume.set_default', { userId, resumeId, newDefaultId: resume.id });
    return resume;
  },

  async deleteResume(userId: string, resumeId: string): Promise<Omit<ResumeDeleteResult, 'deletedUrl'>> {
    const result = await withTransaction(async (client) => {
      return ResumeModel.deleteResume(userId, resumeId, client);
    });

    // Non-fatal cleanup: DB correctness is already committed.
    await StorageService.deleteByUrl(result.deletedUrl).catch(() => undefined);

    const { deletedUrl: _omit, ...rest } = result;
    ResumeService.audit('resume.delete', {
      userId,
      deletedId: result.deletedId,
      reassignedDefaultId: result.newDefault?.id ?? null,
    });
    return rest;
  },

  async scoreATS(resumeText: string, jobDescription: string): Promise<{ score: number; missingKeywords: string[] }> {
    if (!resumeText || !jobDescription) {
      return { score: 0, missingKeywords: [] };
    }

    const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const extractKeywords = (text: string) => {
      const words = normalize(text).split(/\s+/).filter(w => w.length > 2);
      const stopWords = new Set(['and', 'the', 'for', 'with', 'this', 'that', 'from', 'have', 'are', 'was', 'were', 'you', 'your', 'will', 'can']);
      return Array.from(new Set(words.filter(w => !stopWords.has(w))));
    };

    const jobKeywords = extractKeywords(jobDescription);
    const resumeWords = new Set(extractKeywords(resumeText));

    const matchedKeywords = jobKeywords.filter(k => resumeWords.has(k));
    const missingKeywords = jobKeywords.filter(k => !resumeWords.has(k));

    const score = jobKeywords.length > 0
      ? Math.round((matchedKeywords.length / jobKeywords.length) * 100)
      : 0;

    return {
      score,
      missingKeywords: missingKeywords.slice(0, 10),
    };
  },
};

