'use client';

import { useRouter } from 'next/navigation';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

export const NotificationList = ({ notifications, onMarkRead }: NotificationListProps) => {
  const router = useRouter();

  if (!notifications.length) {
    return <p className="py-8 text-center text-sm text-gray-400">No notifications yet.</p>;
  }

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      await onMarkRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {notifications.map((n) => (
        <button
          key={n.id}
          type="button"
          className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-gray-50', !n.read && 'bg-blue-50')}
          onClick={() => void handleClick(n)}
        >
          <div className="flex-1">
            <p className={cn('text-sm', !n.read ? 'font-semibold text-gray-900' : 'text-gray-700')}>{n.title}</p>
            <p className="text-xs text-gray-500">{n.body}</p>
            <p className="mt-1 text-xs text-gray-400">{formatDate(n.created_at)}</p>
          </div>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
        </button>
      ))}
    </div>
  );
};
