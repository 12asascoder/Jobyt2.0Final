import { create } from 'zustand';
import { applicationService } from '../services/application.service';
import { Application } from '../types';

interface ApplicationsState {
  applications: Application[];
  stats: any;
  loading: boolean;

  fetchApplications: () => Promise<void>;
  fetchStats: () => Promise<void>;
  applyToJob: (
    jobId: string,
    payload: {
      resume_id: string;
      cover_letter?: string;
      answers?: { question_id: string; answer: string }[];
    }
  ) => Promise<Application>;
}

export const useApplicationsStore = create<ApplicationsState>((set) => ({
  applications: [],
  stats: null,
  loading: false,

  fetchApplications: async () => {
    set({ loading: true });
    try {
      const res = await applicationService.getMyApplications();
      set({ applications: res.data || [] });
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await applicationService.getApplicationStats();
      set({ stats: res.data });
    } catch (err) {
      console.error('Failed to fetch application stats', err);
    }
  },

  applyToJob: async (jobId, payload) => {
    set({ loading: true });
    try {
      const res = await applicationService.applyToJob(jobId, payload);
      const app = res.data;
      set((state) => ({
        applications: [app, ...state.applications],
      }));
      return app;
    } catch (err) {
      console.error('Failed to apply to job', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
