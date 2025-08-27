'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ContentPollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

interface ContentPollingReturn {
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
  checkNow: () => Promise<void>;
  newContentFound: number;
}

export function useContentPolling({ 
  enabled = true, 
  intervalMs = 5 * 60 * 1000 // 5 minutes default
}: ContentPollingOptions = {}): ContentPollingReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newContentFound, setNewContentFound] = useState(0);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClient();

  // Track user authentication
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const checkForNewContent = useCallback(async () => {
    if (!user || isChecking) return;

    setIsChecking(true);
    setError(null);

    try {
      console.log('Checking for new content...');

      // Get user's followed artists
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('artist_id, artist_name')
        .eq('user_id', user.id);

      if (followsError) {
        throw followsError;
      }

      if (!follows || follows.length === 0) {
        console.log('No followed artists to check');
        setLastChecked(new Date());
        return;
      }

      console.log(`Checking ${follows.length} followed artists for new content`);

      // Simple approach: Create a test notification for demonstration
      // In a real implementation, you'd check APIs here and compare with stored data
      const simulateNewContent = Math.random() < 0.3; // 30% chance of "new content"
      
      if (simulateNewContent && follows.length > 0) {
        const randomArtist = follows[Math.floor(Math.random() * follows.length)];
        
        // Create a sample notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            artist_id: randomArtist.artist_id,
            artist_name: randomArtist.artist_name,
            type: ['new_song', 'new_album', 'new_video'][Math.floor(Math.random() * 3)] as any,
            title: `New content from ${randomArtist.artist_name}!`,
            description: 'Check out their latest release',
            content_url: `https://example.com/artist/${randomArtist.artist_id}`,
            is_seen: false
          });

        if (notificationError) {
          console.warn('Could not create test notification (this is normal if RLS policies are strict):', notificationError);
          // Don't treat this as a fatal error since it's just test/demo functionality
        } else {
          console.log('Created new content notification for', randomArtist.artist_name);
          setNewContentFound(prev => prev + 1);
        }
      }

      setLastChecked(new Date());
      console.log('Content check completed');

    } catch (err: any) {
      console.error('Error checking for new content:', err);
      setError(err.message || 'Failed to check for new content');
    } finally {
      setIsChecking(false);
    }
  }, [user, supabase]); // Removed isChecking from dependencies

  // Automatic polling when enabled
  useEffect(() => {
    if (!enabled || !user) return;

    // Check immediately when enabled
    checkForNewContent();

    // Set up interval for periodic checks
    const interval = setInterval(checkForNewContent, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, user, intervalMs, checkForNewContent]);

  const checkNow = useCallback(async () => {
    await checkForNewContent();
  }, [checkForNewContent]);

  return {
    isChecking,
    lastChecked,
    error,
    checkNow,
    newContentFound
  };
}