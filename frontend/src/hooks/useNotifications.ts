'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Notification } from '@/types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.getPaginated<Notification>(`/notifications?page=${page}`);
      setNotifications(res.data);
      setUnread((res as unknown as { unread: number }).unread ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  return { notifications, unread, isLoading, fetchNotifications, markRead, markAllRead };
};
