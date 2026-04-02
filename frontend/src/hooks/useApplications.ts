'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Application, ApplicationStatus } from '@/types';

export const useApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyApplications = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Application>(`/applications/my?page=${page}`);
      setApplications(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchJobApplications = useCallback(async (jobId: string, page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Application>(`/applications/jobs/${jobId}?page=${page}`);
      setApplications(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (applicationId: string, status: ApplicationStatus) => {
    const res = await api.patch<Application>(`/applications/${applicationId}/status`, { status });
    setApplications((prev) => prev.map((a) => (a.id === applicationId && res.data ? res.data : a)));
  }, []);

  return { applications, total, isLoading, fetchMyApplications, fetchJobApplications, updateStatus };
};
