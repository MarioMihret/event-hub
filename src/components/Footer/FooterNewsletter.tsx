import React from 'react';

const FooterNewsletter: React.FC = () => {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold font-bold text-white">Subscribe to our newsletter</h3>
      <p className="mb-4 text-gray-400">
        Get the latest updates on new features and upcoming events.
      </p>
      <form className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-4 py-2 border rounded-lg bg-white/5 border-white/10 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="px-6 py-2 font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
};

export default FooterNewsletter;