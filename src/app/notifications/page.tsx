'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Card from '@/components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { 
    notifications, 
    unseenCount, 
    isLoading, 
    error, 
    markAsSeen, 
    markAllAsSeen, 
    deleteNotification,
    refreshNotifications,
    clearError
  } = useNotifications(50);

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_seen)
    : notifications;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_seen) {
      await markAsSeen(notification.id);
    }

    if (notification.content_url) {
      window.open(notification.content_url, '_blank');
    } else if (notification.artist_id) {
      window.location.href = `/artist/${notification.artist_id}`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_song':
        return '🎵';
      case 'new_album':
        return '💿';
      case 'new_video':
        return '📺';
      case 'news':
        return '📰';
      default:
        return '🔔';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'new_song':
        return 'New Song';
      case 'new_album':
        return 'New Album';
      case 'new_video':
        return 'New Video';
      case 'news':
        return 'News';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                Stay updated with your followed K-Pop artists
                {unseenCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unseenCount} unread
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshNotifications}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
                title="Refresh notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {unseenCount > 0 && (
                <button
                  onClick={markAllAsSeen}
                  className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 bg-white rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === 'unread'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unread ({unseenCount})
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-red-600">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {filter === 'unread' 
                ? 'All caught up! Check back later for new updates from your followed artists.'
                : 'Follow some K-Pop artists to get notified about their latest songs, albums, videos, and news!'
              }
            </p>
            {filter === 'unread' && notifications.length > 0 && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 text-purple-600 hover:text-purple-800 font-medium"
              >
                View all notifications
              </button>
            )}
          </Card>
        ) : (
          /* Notifications List */
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => (
              <Card
                key={notification.id}
                className={`
                  cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                  ${!notification.is_seen ? 'bg-blue-50 border-l-4 border-l-blue-400 shadow-sm' : 'hover:bg-gray-50'}
                  animate-in slide-in-from-bottom-2 duration-300
                `}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-4">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.is_seen && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {notification.title}
                        </h3>
                        
                        <p className="text-sm text-purple-600 font-medium mb-1">
                          {notification.artist_name}
                        </p>
                        
                        {notification.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {notification.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          
                          {notification.content_url && (
                            <div className="flex items-center text-xs text-gray-400">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 text-gray-300 hover:text-gray-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}