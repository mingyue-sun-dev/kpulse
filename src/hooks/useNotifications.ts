'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Notification } from '@/lib/supabase/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unseenCount: number;
  isLoading: boolean;
  error: string | null;
  markAsSeen: (notificationId: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearError: () => void;
}

export function useNotifications(limit: number = 20): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/notifications?limit=${limit}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear state
          setNotifications([]);
          setUnseenCount(0);
          return;
        }
        throw new Error('Failed to fetch notifications');
      }

      const result = await response.json();
      setNotifications(result.data || []);
      setUnseenCount(result.unseenCount || 0);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial load and auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (_event === 'SIGNED_IN') {
        fetchNotifications();
      } else if (_event === 'SIGNED_OUT') {
        setNotifications([]);
        setUnseenCount(0);
        setIsLoading(false);
      }
    });

    // Initial load
    fetchNotifications();

    return () => subscription.unsubscribe();
  }, [fetchNotifications, supabase]);

  // Real-time notifications
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const notificationsChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New notification received:', payload);
            const newNotification = payload.new as Notification;
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnseenCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification updated:', payload);
            const updatedNotification = payload.new as Notification;
            
            setNotifications(prev =>
              prev.map(notif =>
                notif.id === updatedNotification.id ? updatedNotification : notif
              )
            );
            
            // Update unseen count if seen status changed
            if (payload.old.is_seen !== payload.new.is_seen) {
              if (payload.new.is_seen) {
                setUnseenCount(prev => Math.max(0, prev - 1));
              } else {
                setUnseenCount(prev => prev + 1);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification deleted:', payload);
            const deletedId = payload.old.id;
            
            setNotifications(prev => prev.filter(notif => notif.id !== deletedId));
            
            // Update unseen count if deleted notification was unseen
            if (!payload.old.is_seen) {
              setUnseenCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
      };
    });
  }, [supabase]);

  const markAsSeen = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_seen: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as seen');
      }

      // Optimistic update (real-time subscription will handle the actual update)
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_seen: true } : notif
        )
      );
    } catch (err: any) {
      console.error('Error marking notification as seen:', err);
      setError(err.message || 'Failed to mark notification as seen');
    }
  }, []);

  const markAllAsSeen = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as seen');
      }

      // Optimistic update
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_seen: true }))
      );
      setUnseenCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as seen:', err);
      setError(err.message || 'Failed to mark all notifications as seen');
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Optimistic update (real-time subscription will handle the actual update)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'Failed to delete notification');
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    notifications,
    unseenCount,
    isLoading,
    error,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
    refreshNotifications,
    clearError
  };
}