'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Job } from '@/types';

interface JobFilters {
  keyword?: string;
  location?: string;
  type?: string;
  salary_min?: number;
  salary_max?: number;
  skills?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchJobs = useCallback(async (filters: JobFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      );
      const res = await api.getPaginated<Job>(`/jobs?${params}`);
      setJobs(res.data);
      setTotal(res.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { jobs, total, isLoading, error, searchJobs };
};
