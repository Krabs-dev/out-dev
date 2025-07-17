'use client';

import dynamic from 'next/dynamic';
import PageLayout from '@/components/layout/page-layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

const LeaderboardContent = dynamic(() => import('./leaderboard-content'), {
  ssr: false,
  loading: () => (
    <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner 
          size="md" 
          message="Loading leaderboard..." 
          className="h-full"
        />
      </div>
    </main>
  )
});

const Leaderboard = () => {
  return (
    <PageLayout>
      <LeaderboardContent />
    </PageLayout>
  );
};

export default Leaderboard;