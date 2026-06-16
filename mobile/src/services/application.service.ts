import { api } from '../lib/api';
import { APIResponse, Application } from '../types';

export const applicationService = {
  async getMyApplications(): Promise<APIResponse<Application[]>> {
    const response = await api.get<APIResponse<Application[]>>('/applications/my');
    return response.data;
  },

  async getMyApplicationsFiltered(params: { status?: string; jobTitle?: string }): Promise<APIResponse<Application[]>> {
    const response = await api.get<APIResponse<Application[]>>('/applications/my/filtered', { params });
    return response.data;
  },

  async getApplicationStats(): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>('/applications/my/stats');
    return response.data;
  },

  async checkApplication(jobId: string): Promise<APIResponse<{ applied: boolean }>> {
    const response = await api.get<APIResponse<{ applied: boolean }>>(`/applications/jobs/${jobId}/check`);
    return response.data;
  },

  async applyToJob(
    jobId: string,
    payload: {
      resume_id: string;
      cover_letter?: string;
      answers?: { question_id: string; answer: string }[];
    }
  ): Promise<APIResponse<Application>> {
    const response = await api.post<APIResponse<Application>>(`/applications/jobs/${jobId}`, payload);
    return response.data;
  },

  async getPipelineEvents(applicationId: string): Promise<APIResponse<any[]>> {
    const response = await api.get<APIResponse<any[]>>(`/applications/${applicationId}/events`);
    return response.data;
  },
};
