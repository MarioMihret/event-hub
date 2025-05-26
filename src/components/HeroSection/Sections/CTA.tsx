import React from 'react';
import { Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CTA: React.FC = () => {
  const router = useRouter();
  return (
    <section className="relative py-20 bg-gradient-to-b from-purple-900/20 to-transparent">
      <div className="container px-6 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-6 text-4xl font-bold">Ready to Create Your Event?</h2>
          <p className="mb-8 text-lg text-gray-300">
            Let  work together to make your vision a reality
          </p>
          <button
            onClick={ () => router.push('/organizer') }
            className="inline-flex items-center gap-2 px-8 py-4 font-semibold text-white transition-all transform bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:opacity-90 hover:scale-105">
            <Calendar className="w-5 h-5" />
            Get Started Now
          </button>
        </div>
      </div>
    </section>
  );
};
export default CTA;