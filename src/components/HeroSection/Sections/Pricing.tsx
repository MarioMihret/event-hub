import React from 'react';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$299',
    description: 'Perfect for small events',
    features: [
      'Up to 50 guests',
      'Basic event planning',
      'Standard decorations',
      'Basic sound system',
      '4-hour duration'
    ]
  },
  {
    name: 'Professional',
    price: '$799',
    description: 'Ideal for medium-sized events',
    features: [
      'Up to 150 guests',
      'Full event planning',
      'Premium decorations',
      'Professional AV setup',
      '8-hour duration',
      'Photography included'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: '$1,999',
    description: 'For large-scale events',
    features: [
      'Unlimited guests',
      'VIP event planning',
      'Luxury decorations',
      'Premium AV production',
      'Full-day coverage',
      'Photo & video included',
      'VIP catering'
    ]
  }
];

const Pricing: React.FC = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
          <p className="text-gray-300 text-lg">
            Choose the perfect package for your event
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white/5 backdrop-blur-sm rounded-xl p-8 hover:transform hover:scale-105 transition-all duration-300 ${
                plan.popular ? 'border-2 border-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-purple-400 mb-4">{plan.price}</div>
              <p className="text-gray-400 mb-6">{plan.description}</p>

              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-semibold hover:opacity-90 transition-all">
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;