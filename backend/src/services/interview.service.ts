import axios from 'axios';
import { InterviewModel, Interview, InterviewStatus } from '../models/interview.model';
import { ApplicationModel } from '../models/application.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../types';
import Groq, { toFile } from 'groq-sdk';
import { io } from '../config/socket';

export interface LiveSessionState {
  code: string;
  language: string;
  notes: string;
  participants: Set<string>; // active userIds in the room
}

// In-memory store for active session states (could be replaced by Redis in production)
const activeSessions = new Map<string, LiveSessionState>();

export const InterviewService = {
  async scheduleInterview(
    applicationId: string,
    scheduledAt: Date,
    requester: JwtPayload,
  ): Promise<Interview> {
    // 1. Fetch application details
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
    }

    // 2. Authorize requester
    if (requester.role === 'recruiter') {
      // Find full application details to verify recruiter owns the job
      const recApplication = await ApplicationModel.findRecruiterApplicationById(
        requester.userId,
        applicationId,
      );
      if (!recApplication) {
        throw new ForbiddenError(
          'You are not authorized to schedule an interview for this application',
          'RECRUITER_FORBIDDEN',
        );
      }
    } else if (requester.role !== 'admin') {
      throw new ForbiddenError('Only recruiters and admins can schedule interviews', 'ROLE_FORBIDDEN');
    }

    // 3. Check scheduled date
    if (new Date(scheduledAt).getTime() < Date.now()) {
      throw new BadRequestError('Scheduled date must be in the future', 'INVALID_SCHEDULED_DATE');
    }

    // 4. Create interview record
    const interview = await InterviewModel.createInterview({
      application_id: applicationId,
      interviewer_id: requester.userId,
      candidate_id: application.applicant_id,
      scheduled_at: new Date(scheduledAt),
    });

    return interview;
  },

  async getInterviewDetails(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    // Authorize participant
    const isParticipant =
      interview.candidate_id === user.userId || interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to view this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    return interview;
  },

  async listUserInterviews(user: JwtPayload): Promise<Interview[]> {
    return InterviewModel.listUserInterviews(user.userId, user.role);
  },

  async updateNotes(interviewId: string, notes: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);
    
    // Only interviewer or admin can update notes
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can update interview notes',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Sync to in-memory session if live
    const liveSession = activeSessions.get(interviewId);
    if (liveSession) {
      liveSession.notes = notes;
    }

    // Persist to database
    return InterviewModel.updateInterview(interviewId, { notes });
  },

  async startInterview(interviewId: string, user: JwtPayload): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can start the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    if (interview.status === 'completed') {
      throw new BadRequestError('This interview has already been completed', 'INTERVIEW_COMPLETED');
    }

    // Initialize in-memory session state if not already done
    if (!activeSessions.has(interviewId)) {
      activeSessions.set(interviewId, {
        code: interview.code_content || '// Live coding playground\n',
        language: interview.code_language || 'javascript',
        notes: interview.notes || '',
        participants: new Set(),
      });
    }

    // Update status in DB
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'live',
      started_at: interview.started_at || new Date(),
    });

    return updated;
  },

  async endInterview(
    interviewId: string,
    data: { feedback?: string; rating?: number; codeContent?: string; language?: string },
    user: JwtPayload,
  ): Promise<Interview> {
    const interview = await this.getInterviewDetails(interviewId, user);

    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'Only the interviewer or admin can end the interview',
        'NOT_THE_INTERVIEWER',
      );
    }

    // Pull current live state from memory if available
    const liveState = activeSessions.get(interviewId);
    const finalCode = data.codeContent !== undefined ? data.codeContent : (liveState?.code || interview.code_content);
    const finalLanguage = data.language !== undefined ? data.language : (liveState?.language || interview.code_language);
    const finalNotes = liveState?.notes || interview.notes;

    // Update interview status and save the session snapshot to the database
    const updated = await InterviewModel.updateInterview(interviewId, {
      status: 'completed',
      ended_at: new Date(),
      code_content: finalCode,
      code_language: finalLanguage,
      notes: finalNotes,
      feedback: data.feedback !== undefined ? data.feedback : interview.feedback,
      rating: data.rating !== undefined ? data.rating : interview.rating,
    });

    // Advance the applicant application pipeline status to next step if applicable, or leave it as interview
    // (Optional, let's keep it isolated to this feature or sync with application status)

    // Clean up active session
    activeSessions.delete(interviewId);

    return updated;
  },

  // --- Live WebSocket Session State Methods ---
  getLiveSession(interviewId: string): LiveSessionState | null {
    return activeSessions.get(interviewId) || null;
  },

  initializeLiveSession(interviewId: string, initialCode = '', initialLanguage = 'javascript', initialNotes = ''): LiveSessionState {
    let session = activeSessions.get(interviewId);
    if (!session) {
      session = {
        code: initialCode || '// Live coding playground\n',
        language: initialLanguage || 'javascript',
        notes: initialNotes || '',
        participants: new Set(),
      };
      activeSessions.set(interviewId, session);
    }
    return session;
  },

  updateLiveCode(interviewId: string, code: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.code = code;
    }
  },

  updateLiveLanguage(interviewId: string, language: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.language = language;
    }
  },

  addParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.add(userId);
    }
  },

  removeParticipant(interviewId: string, userId: string): void {
    const session = activeSessions.get(interviewId);
    if (session) {
      session.participants.delete(userId);
      // Clean up empty sessions if status is completed (or leave it to garbage collection/explicit end)
    }
  },

  async generateFollowupQuestion(interviewId: string, code: string, language: string): Promise<string | null> {
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    const ollamaApiKey = process.env.OLLAMA_API_KEY;

    const systemPrompt = `You are a technical interviewer conducting a live coding interview.
The candidate is coding in ${language}.
Here is their current code:
\`\`\`${language}
${code}
\`\`\`
Please generate ONE brief, highly relevant follow-up technical question or suggestion to guide the candidate or test their understanding of their code. Keep the response concise (maximum 2-3 sentences), professional, and direct.`;

    // 1. Try Claude API if configured (Production)
    if (claudeApiKey && claudeApiKey.trim()) {
      try {
        console.log('[Claude API] Generating follow-up question...');
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            messages: [{ role: 'user', content: systemPrompt }],
          },
          {
            headers: {
              'x-api-key': claudeApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.content?.[0]?.text;
        if (text) return text.trim();
      } catch (err: any) {
        console.error('[Claude API] Failed:', err.message);
      }
    }

    // 2. Try Groq API if configured
    if (groqApiKey && groqApiKey.trim()) {
      try {
        console.log('[Groq API] Generating follow-up question...');
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.7,
            max_tokens: 300,
          },
          {
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch (err: any) {
        console.error('[Groq API] Failed:', err.message);
      }
    }

    // 3. Try Ollama if configured
    if (ollamaApiKey && ollamaApiKey.trim()) {
      try {
        console.log('[Ollama API] Generating follow-up question...');
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await axios.post(
          ollamaUrl,
          {
            model: process.env.OLLAMA_MODEL || 'llama3',
            messages: [{ role: 'user', content: systemPrompt }],
            stream: false,
          },
          {
            headers: {
              'Authorization': `Bearer ${ollamaApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        const text = response.data?.message?.content || response.data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch (err: any) {
        console.error('[Ollama API] Failed:', err.message);
      }
    }

    console.warn('[AI Services] All technical interview follow-up providers failed or are unconfigured.');
    return null;
  },

  async transcribeAudio(
    interviewId: string,
    audioBuffer: Buffer,
    originalName: string,
    user: JwtPayload,
  ): Promise<string> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    const isCandidate = interview.candidate_id === user.userId;
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isCandidate && !isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to participate in this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new BadRequestError('Groq API Key is not configured in environment', 'GROQ_NOT_CONFIGURED');
    }

    console.log(`[Whisper STT] Transcribing file for interview: ${interviewId}, size: ${audioBuffer.length} bytes`);
    const groq = new Groq({ apiKey: groqApiKey });
    const file = await toFile(audioBuffer, originalName || 'audio.webm');

    const response = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      temperature: 0,
    });

    const text = response.text || '';
    if (text.trim()) {
      io?.to(`interview:${interviewId}`).emit('voice_transcription', {
        userId: user.userId,
        role: user.role,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    return text.trim();
  },

  async generateTTS(interviewId: string, text: string, user: JwtPayload): Promise<Buffer> {
    const interview = await InterviewModel.getById(interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found', 'INTERVIEW_NOT_FOUND');
    }

    const isCandidate = interview.candidate_id === user.userId;
    const isInterviewer = interview.interviewer_id === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isCandidate && !isInterviewer && !isAdmin) {
      throw new ForbiddenError(
        'You are not authorized to participate in this interview',
        'NOT_INTERVIEW_PARTICIPANT',
      );
    }

    const trimmedText = (text || '').trim();
    if (!trimmedText) {
      throw new BadRequestError('Text prompt is required for TTS synthesis', 'TEXT_REQUIRED');
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    // 1. OpenAI TTS
    if (openaiApiKey && openaiApiKey.trim()) {
      try {
        console.log('[OpenAI TTS] Generating speech...');
        const response = await axios.post(
          'https://api.openai.com/v1/audio/speech',
          {
            model: 'tts-1',
            input: trimmedText,
            voice: 'alloy',
          },
          {
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 10000,
          },
        );
        return Buffer.from(response.data);
      } catch (err: any) {
        console.error('[OpenAI TTS] Failed:', err.message);
      }
    }

    // 2. ElevenLabs TTS
    if (elevenlabsApiKey && elevenlabsApiKey.trim()) {
      try {
        console.log('[ElevenLabs TTS] Generating speech...');
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: trimmedText,
            model_id: 'eleven_monolingual_v1',
          },
          {
            headers: {
              'xi-api-key': elevenlabsApiKey,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 10000,
          },
        );
        return Buffer.from(response.data);
      } catch (err: any) {
        console.error('[ElevenLabs TTS] Failed:', err.message);
      }
    }

    // 3. Free Public Fallback: Google Translate TTS
    try {
      console.log('[Google Translate TTS] Generating fallback speech...');
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(trimmedText)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (err: any) {
      console.error('[Google Translate TTS] Failed:', err.message);
      throw new BadRequestError('Failed to generate Text-to-Speech audio', 'TTS_FAILED');
    }
  },
};
