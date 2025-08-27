'use client';

import { useContentPolling } from '@/hooks/useContentPolling';
import { useEffect } from 'react';

interface ContentPollingProviderProps {
  children: React.ReactNode;
}

export default function ContentPollingProvider({ children }: ContentPollingProviderProps) {
  const { isChecking, lastChecked, error, checkNow, newContentFound } = useContentPolling({
    enabled: true,
    intervalMs: 5 * 60 * 1000 // Check every 5 minutes when app is open
  });

  // Log status for development
  useEffect(() => {
    if (lastChecked) {
      console.log(`📡 Content check completed at ${lastChecked.toLocaleTimeString()}`);
      if (newContentFound > 0) {
        console.log(`🎵 Found ${newContentFound} new content notifications!`);
      }
    }
  }, [lastChecked, newContentFound]);

  useEffect(() => {
    if (error) {
      console.error('❌ Content polling error:', error);
    }
  }, [error]);

  // Check for content when app loads (only once)
  useEffect(() => {
    // Small delay to let authentication settle
    const timer = setTimeout(() => {
      checkNow();
    }, 3000); // Increased delay to 3 seconds

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  return <>{children}</>;
}