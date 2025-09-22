'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
// import { Follow } from '@/lib/supabase/types';

interface UseFollowOptions {
  artistId: string;
  artistName: string;
}

interface UseFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  isCheckingStatus: boolean;
  error: string | null;
  user: any;
  followCount: number;
  toggleFollow: () => Promise<void>;
  clearError: () => void;
}

export function useFollow({ artistId, artistName }: UseFollowOptions): UseFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [followCount, setFollowCount] = useState(0);
  
  const supabase = createClient();

  // Fetch follow status and count
  const checkFollowStatus = useCallback(async (currentUser?: any) => {
    try {
      // Get follow count for this artist
      const { count, error: countError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId);

      if (countError && countError.code !== 'PGRST116') {
        console.error('Error fetching follow count:', countError);
      } else {
        setFollowCount(count || 0);
      }

      // Check if current user is following
      if (currentUser) {
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
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      console.error('Error in checkFollowStatus:', err);
      setError('Failed to check follow status');
    }
  }, [artistId, supabase]);

  // Initialize and listen for auth changes
  useEffect(() => {
    const initializeFollow = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        await checkFollowStatus(currentUser);
      } catch (err) {
        console.error('Error initializing follow state:', err);
        setError('Failed to initialize follow state');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    initializeFollow();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setIsCheckingStatus(true);
        await checkFollowStatus(newUser);
        setIsCheckingStatus(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkFollowStatus, supabase]);

  // Listen for real-time follow changes
  useEffect(() => {
    const followsChannel = supabase
      .channel(`follows:${artistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `artist_id=eq.${artistId}`,
        },
        (payload) => {
          console.log('Follow change detected:', payload);
          
          // Update follow count
          if (payload.eventType === 'INSERT') {
            setFollowCount(prev => prev + 1);
            if (user && payload.new.user_id === user.id) {
              setIsFollowing(true);
            }
          } else if (payload.eventType === 'DELETE') {
            setFollowCount(prev => Math.max(0, prev - 1));
            if (user && payload.old.user_id === user.id) {
              setIsFollowing(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
    };
  }, [artistId, user, supabase]);

  const toggleFollow = useCallback(async () => {
    if (!user) {
      setError('Please login to follow artists');
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

        // Optimistic update
        setIsFollowing(false);
        setFollowCount(prev => Math.max(0, prev - 1));
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
          // Handle duplicate follow attempts
          if (error.code === '23505') {
            setIsFollowing(true);
            return;
          }
          throw error;
        }

        // Optimistic update
        setIsFollowing(true);
        setFollowCount(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      setError(err.message || 'Failed to update follow status');
      
      // Revert optimistic updates on error
      await checkFollowStatus(user);
    } finally {
      setIsLoading(false);
    }
  }, [user, artistId, artistName, isFollowing, checkFollowStatus, supabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isFollowing,
    isLoading,
    isCheckingStatus,
    error,
    user,
    followCount,
    toggleFollow,
    clearError
  };
}