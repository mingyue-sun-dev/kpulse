'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
// import { Follow } from '@/lib/supabase/types';

interface FollowButtonProps {
  artistId: string;
  artistName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  onToggle?: (artistId: string, isFollowing: boolean) => void;
}

export default function FollowButton({
  artistId,
  artistName,
  className = '',
  size = 'md',
  variant = 'default',
  onToggle
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClient();

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Variant classes for following/not following states
  const getVariantClasses = () => {
    if (isFollowing) {
      switch (variant) {
        case 'outline':
          return 'border border-purple-600 text-purple-600 bg-white hover:bg-purple-50';
        case 'ghost':
          return 'text-purple-600 bg-transparent hover:bg-purple-50';
        default:
          return 'bg-purple-600 text-white hover:bg-purple-700';
      }
    } else {
      switch (variant) {
        case 'outline':
          return 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50';
        case 'ghost':
          return 'text-gray-700 bg-transparent hover:bg-gray-100';
        default:
          return 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700';
      }
    }
  };

  // Check authentication and follow status
  useEffect(() => {
    const checkAuthAndFollowStatus = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (!currentUser) {
          setIsCheckingStatus(false);
          return;
        }

        // Check if user is following this artist
        const { data: follow, error } = await supabase
          .from('follows')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('artist_id', artistId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking follow status:', error);
          setError('Failed to check follow status');
        } else {
          setIsFollowing(!!follow);
        }
      } catch (err) {
        console.error('Error in checkAuthAndFollowStatus:', err);
        setError('Failed to check follow status');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkAuthAndFollowStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        checkAuthAndFollowStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [artistId, supabase]);

  const handleFollowToggle = async () => {
    if (!user) {
      // Redirect to login or show login modal
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isFollowing) {
        // Unfollow artist
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId);

        if (error) {
          throw error;
        }

        setIsFollowing(false);
        onToggle?.(artistId, false);
      } else {
        // Follow artist
        const { error } = await supabase
          .from('follows')
          .insert({
            user_id: user.id,
            artist_id: artistId,
            artist_name: artistName
          });

        if (error) {
          throw error;
        }

        setIsFollowing(true);
        onToggle?.(artistId, true);
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      setError(err.message || 'Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking initial status
  if (isCheckingStatus) {
    return (
      <button
        disabled
        className={`
          inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200
          ${sizeClasses[size]}
          bg-gray-100 text-gray-400 cursor-not-allowed
          ${className}
        `}
      >
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
        Loading...
      </button>
    );
  }

  // Don't show for unauthenticated users on certain pages
  if (!user && variant === 'ghost') {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleFollowToggle}
        disabled={isLoading}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200
          ${sizeClasses[size]}
          ${getVariantClasses()}
          ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
          ${className}
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
          disabled:cursor-not-allowed
        `}
        title={!user ? 'Login to follow artists' : (isFollowing ? `Unfollow ${artistName}` : `Follow ${artistName}`)}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 opacity-75"></div>
            {isFollowing ? 'Unfollowing...' : 'Following...'}
          </>
        ) : (
          <>
            {isFollowing ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Following
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {!user ? 'Login to Follow' : 'Follow'}
              </>
            )}
          </>
        )}
      </button>
      
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-xs z-10">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}