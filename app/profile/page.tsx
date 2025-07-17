'use client';

import dynamic from 'next/dynamic';
import PageLayout from '@/components/layout/page-layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

const ProfileContent = dynamic(() => import('./profile-content'), {
  ssr: false,
  loading: () => (
    <PageLayout>
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="md" message="Loading profile..." />
      </div>
    </PageLayout>
  )
});

const Profile = () => {
  return (
    <PageLayout>
      <ProfileContent />
    </PageLayout>
  );
};

export default Profile;