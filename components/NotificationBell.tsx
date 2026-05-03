import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  related_trip_id: number | null;
  created_at: string;
}

interface Props {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onTripClick: (tripId: number) => void;
}

const ICONS: Record<string, string> = {
  new_offer: '💰',
  offer_accepted: '✅',
  chat_message: '💬',
  offer_message: '💬',
  trip_status: '🚛',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

const NotificationBell: React.FC<Props> = ({ notifications, onMarkAllRead, onTripClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && unreadCount > 0) onMarkAllRead();
  }, [isOpen, unreadCount, onMarkAllRead]);

  const handleNotificationClick = (n: Notification) => {
    if (n.related_trip_id) onTripClick(n.related_trip_id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        aria-label="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Marcar todo como leído
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                Sin notificaciones por ahora
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex gap-3 items-start ${!n.is_read ? 'bg-amber-500/5' : ''}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${!n.is_read ? 'text-slate-100' : 'text-slate-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
