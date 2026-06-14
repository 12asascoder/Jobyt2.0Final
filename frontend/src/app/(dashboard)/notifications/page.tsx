'use client';

import { useEffect, useState } from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { Spinner, Button, Card } from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types';

export default function NotificationsPage() {
  const { notifications, unread, pagination, isLoading, fetchNotifications, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  return (
    <div className="mx-auto max-w-4xl py-6 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notifications {unread > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">{unread} new</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and view your notifications history.</p>
        </div>
        
        <div className="flex gap-2">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Unread
        </button>
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <Card className="overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-4">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-slate-900">No notifications</h3>
              <p className="mt-1 text-sm text-slate-500">
                {filter === 'unread' ? "You're all caught up! No unread notifications." : "When you receive notifications, they'll show up here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <NotificationList notifications={filteredNotifications} onMarkRead={markRead} />
            </div>
          )}
        </Card>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && filter === 'all' && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => fetchNotifications(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => fetchNotifications(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
