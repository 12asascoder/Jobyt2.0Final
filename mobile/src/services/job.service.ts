import { api } from '../lib/api';
import { APIResponse, Job } from '../types';

export const jobService = {
  async getJobs(params: {
    q?: string;
    type?: string;
    location?: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse<{ jobs: Job[]; total: number; page: number; limit: number }>> {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  async getJobById(id: string): Promise<APIResponse<{ job: Job } | Job>> {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  async getSavedJobs(): Promise<APIResponse<Job[]>> {
    const response = await api.get<APIResponse<Job[]>>('/users/me/saved-jobs');
    return response.data;
  },

  async saveJob(jobId: string): Promise<APIResponse<any>> {
    const response = await api.post(`/users/me/saved-jobs/${jobId}`);
    return response.data;
  },

  async unsaveJob(jobId: string): Promise<APIResponse<any>> {
    const response = await api.delete(`/users/me/saved-jobs/${jobId}`);
    return response.data;
  },
};
