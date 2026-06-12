import { create } from 'zustand';
import { jobService } from '../services/job.service';
import { Job } from '../types';

interface JobsState {
  jobs: Job[];
  savedJobs: Job[];
  recommendedJobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  total: number;
  page: number;

  fetchJobs: (params?: any, append?: boolean) => Promise<void>;
  fetchJobDetails: (id: string) => Promise<void>;
  fetchSavedJobs: () => Promise<void>;
  toggleSaveJob: (jobId: string) => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  savedJobs: [],
  recommendedJobs: [],
  currentJob: null,
  loading: false,
  total: 0,
  page: 1,

  fetchJobs: async (params = {}, append = false) => {
    set({ loading: true });
    try {
      const res = await jobService.getJobs(params);
      const data = res.data;
      
      // Calculate matches / recommendations (mock-annotating from general feed if needed)
      const jobsWithSavedState = data.jobs.map((job) => ({
        ...job,
        is_saved: get().savedJobs.some((sj) => sj.id === job.id),
      }));

      set((state) => ({
        jobs: append ? [...state.jobs, ...jobsWithSavedState] : jobsWithSavedState,
        total: data.total || 0,
        page: data.page || 1,
      }));
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchJobDetails: async (id) => {
    set({ loading: true, currentJob: null });
    try {
      const res = await jobService.getJobById(id);
      const job = 'job' in res.data ? res.data.job : res.data;
      
      const enrichedJob = {
        ...job,
        is_saved: get().savedJobs.some((sj) => sj.id === job.id),
      };
      
      set({ currentJob: enrichedJob });
    } catch (err) {
      console.error('Failed to fetch job details', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchSavedJobs: async () => {
    try {
      const res = await jobService.getSavedJobs();
      // Backend might return raw array directly or wrap in { jobs: [] }
      const list = Array.isArray(res.data) ? res.data : (res.data as any).jobs || [];
      
      const mapped = list.map((job: any) => ({ ...job, is_saved: true }));
      set({ savedJobs: mapped });
      
      // Update is_saved flag on current list
      set((state) => ({
        jobs: state.jobs.map((j) => ({
          ...j,
          is_saved: mapped.some((sj: any) => sj.id === j.id),
        })),
      }));
    } catch (err) {
      console.error('Failed to fetch saved jobs', err);
    }
  },

  toggleSaveJob: async (jobId) => {
    const { jobs, savedJobs } = get();
    const isCurrentlySaved = savedJobs.some((sj) => sj.id === jobId);

    // Optimistic UI updates
    let updatedJobs = jobs.map((j) => (j.id === jobId ? { ...j, is_saved: !isCurrentlySaved } : j));
    let updatedSaved: Job[];
    
    if (isCurrentlySaved) {
      updatedSaved = savedJobs.filter((sj) => sj.id !== jobId);
    } else {
      const targetJob = jobs.find((j) => j.id === jobId);
      updatedSaved = targetJob ? [...savedJobs, { ...targetJob, is_saved: true }] : savedJobs;
    }

    set({ jobs: updatedJobs, savedJobs: updatedSaved });
    if (get().currentJob?.id === jobId) {
      set((state) => ({
        currentJob: state.currentJob ? { ...state.currentJob, is_saved: !isCurrentlySaved } : null,
      }));
    }

    try {
      if (isCurrentlySaved) {
        await jobService.unsaveJob(jobId);
      } else {
        await jobService.saveJob(jobId);
      }
    } catch (err) {
      console.error('Failed to toggle save job on server, reverting state', err);
      // Revert state
      set({ jobs, savedJobs });
    }
  },
}));
