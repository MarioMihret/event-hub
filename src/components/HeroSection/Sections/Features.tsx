import React from 'react';
import { Shield, Clock, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: "100% Satisfaction",
    description: "Our commitment to excellence ensures your complete satisfaction"
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Round-the-clock assistance for all your event needs"
  },
  {
    icon: Sparkles,
    title: "Premium Experience",
    description: "Luxury service with attention to every detail"
  }
];

const Features: React.FC = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-purple-900/20 to-transparent">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="text-center p-8"
            >
              <div className="inline-block p-4 bg-white/5 rounded-full mb-6">
                <Icon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Features;