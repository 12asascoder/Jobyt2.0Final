import { InterviewService } from '../services/interview.service';
import { InterviewModel } from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import pool from '../config/database';
import { JwtPayload } from '../types';

jest.mock('../config/database', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../models/application.model', () => ({
  ApplicationModel: {
    findById: jest.fn(),
    findRecruiterApplicationById: jest.fn(),
  },
}));

jest.mock('../models/interview.model', () => ({
  InterviewModel: {
    createInterview: jest.fn(),
    getById: jest.fn(),
    listUserInterviews: jest.fn(),
    updateInterview: jest.fn(),
    isParticipant: jest.fn(),
  },
}));

describe('InterviewService', () => {
  const mockRequester: JwtPayload = {
    userId: 'recruiter-1',
    email: 'recruiter@company.com',
    role: 'recruiter',
  };

  const mockCandidate: JwtPayload = {
    userId: 'candidate-1',
    email: 'candidate@example.com',
    role: 'applicant',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleInterview', () => {
    it('should throw NotFoundError if application does not exist', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() + 86400000), mockRequester),
      ).rejects.toThrow('Application not found');
    });

    it('should throw ForbiddenError if recruiter is not owner of application', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue(null);

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() + 86400000), mockRequester),
      ).rejects.toThrow('You are not authorized to schedule an interview');
    });

    it('should throw BadRequestError if scheduled date is in the past', async () => {
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue({ id: 'app-1' });

      await expect(
        InterviewService.scheduleInterview('app-1', new Date(Date.now() - 10000), mockRequester),
      ).rejects.toThrow('Scheduled date must be in the future');
    });

    it('should successfully schedule and save to database', async () => {
      const scheduledDate = new Date(Date.now() + 86400000);
      (ApplicationModel.findById as jest.Mock).mockResolvedValue({ applicant_id: 'candidate-1' });
      (ApplicationModel.findRecruiterApplicationById as jest.Mock).mockResolvedValue({ id: 'app-1' });
      (InterviewModel.createInterview as jest.Mock).mockResolvedValue({
        id: 'interview-1',
        application_id: 'app-1',
        interviewer_id: 'recruiter-1',
        candidate_id: 'candidate-1',
        status: 'scheduled',
        scheduled_at: scheduledDate,
      });

      const result = await InterviewService.scheduleInterview('app-1', scheduledDate, mockRequester);

      expect(InterviewModel.createInterview).toHaveBeenCalledWith({
        application_id: 'app-1',
        interviewer_id: 'recruiter-1',
        candidate_id: 'candidate-1',
        scheduled_at: scheduledDate,
      });
      expect(result.status).toBe('scheduled');
    });
  });

  describe('live session management', () => {
    const mockInterview = {
      id: 'interview-1',
      application_id: 'app-1',
      interviewer_id: 'recruiter-1',
      candidate_id: 'candidate-1',
      status: 'scheduled',
      code_content: '// initial code',
      code_language: 'javascript',
      notes: 'old notes',
    };

    beforeEach(() => {
      (InterviewModel.getById as jest.Mock).mockResolvedValue(mockInterview);
    });

    it('should successfully start an interview and initialize live session', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        status: 'live',
        started_at: new Date(),
      });

      const result = await InterviewService.startInterview('interview-1', mockRequester);

      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        status: 'live',
        started_at: expect.any(Date),
      });
      expect(result.status).toBe('live');

      // Verify in-memory session initialization
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession).not.toBeNull();
      expect(liveSession?.code).toBe('// initial code');
      expect(liveSession?.language).toBe('javascript');
      expect(liveSession?.notes).toBe('old notes');
    });

    it('should synchronize live code modifications in memory', async () => {
      InterviewService.updateLiveCode('interview-1', 'console.log("hello");');
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession?.code).toBe('console.log("hello");');
    });

    it('should update recruiter private notes and database', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        notes: 'new notes updated',
      });

      await InterviewService.updateNotes('interview-1', 'new notes updated', mockRequester);

      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession?.notes).toBe('new notes updated');
      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        notes: 'new notes updated',
      });
    });

    it('should save playground state and close session when ended', async () => {
      (InterviewModel.updateInterview as jest.Mock).mockResolvedValue({
        ...mockInterview,
        status: 'completed',
        code_content: 'console.log("hello");',
        notes: 'new notes updated',
        feedback: 'good candidate',
        rating: 5,
      });

      const result = await InterviewService.endInterview(
        'interview-1',
        { feedback: 'good candidate', rating: 5 },
        mockRequester,
      );

      expect(InterviewModel.updateInterview).toHaveBeenCalledWith('interview-1', {
        status: 'completed',
        ended_at: expect.any(Date),
        code_content: 'console.log("hello");',
        code_language: 'javascript',
        notes: 'new notes updated',
        feedback: 'good candidate',
        rating: 5,
      });
      expect(result.status).toBe('completed');

      // Live session should be garbage collected/cleaned up
      const liveSession = InterviewService.getLiveSession('interview-1');
      expect(liveSession).toBeNull();
    });
  });
});
