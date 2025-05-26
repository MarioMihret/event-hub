import dynamic from 'next/dynamic'
import { Suspense } from 'react';

const MeetingClientPage = dynamic(() => import('./MeetingClientPage.tsx'), {
  ssr: false, // This ensures the component is only rendered on the client side
});

export default function MeetingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}> {/* You can customize the fallback UI */}
      <MeetingClientPage />
    </Suspense>
  );
}