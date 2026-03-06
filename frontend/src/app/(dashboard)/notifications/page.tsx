'use client';

import { useEffect } from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { Spinner, Button, Card } from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
  const { notifications, unread, isLoading, fetchNotifications, markRead, markAllRead } = useNotifications();

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications {unread > 0 && `(${unread})`}</h1>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>}
      </div>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {!isLoading && (
        <Card>
          <NotificationList notifications={notifications} onMarkRead={markRead} />
        </Card>
      )}
    </div>
  );
}
