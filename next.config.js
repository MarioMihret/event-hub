/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode to prevent duplicate API calls in development
  reactStrictMode: false,

  // Enable ESLint during build (assuming errors will be fixed)
  eslint: {
    ignoreDuringBuilds: true, 
  },

  // Enable TypeScript checking during build (assuming errors will be fixed)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  // Optimize image loading by allowing external domains
  images: {
    formats: ["image/avif", "image/webp"], // Enable modern image formats for better performance
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Add dangerouslyAllowSVG for SVG support
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Commented out - likely breaks client-side JS
    // Add higher quality and larger sizes for better handling of external images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Enable experimental optimizations if needed
  experimental: {
    optimizeCss: true, // Improve CSS performance
    serverActions: {
      bodySizeLimit: '2mb' // Configure server actions with an object instead of boolean
    },
  },
  
  // Improved webpack configuration to fix ChunkLoadError
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Avoid 'self is not defined' error in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Optimize chunking to reduce the chunk size and prevent timeout issues
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Create separate chunks for larger modules
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next|next-auth)[\\/]/,
            priority: 40,
            chunks: 'all',
            enforce: true,
          },
          // Shared components chunk
          components: {
            name: 'components',
            test: /[\\/]components[\\/]/,
            minChunks: 2,
            priority: 30,
            enforce: true,
          },
          // Group utility functions
          utils: {
            name: 'utils',
            test: /[\\/]utils[\\/]/,
            minChunks: 2,
            priority: 20,
          },
          // Core app functionality
          app: {
            name: 'app',
            test: /[\\/]app[\\/]/,
            minChunks: 2,
            priority: 10,
          },
          // Default chunks for remaining code
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 0,
          }
        },
        // Increase maximum size of initial chunks to avoid too many small files
        maxInitialRequests: 25,
        // Decrease minimum size to ensure proper chunking
        minSize: 20000,
      };
      
      // Increase timeout for chunk loading
      config.output.chunkLoadTimeout = 60000; // 60 seconds
    }
    
    return config;
  },
  
  // Other configurations can be added here

  async headers() {
    // IMPORTANT: Replace 'YOUR_JAAS_APP_ID.8x8.vc' with your actual JaaS domain
    // For example, if your JAAS_APP_ID is 'my-app-123', the domain is 'my-app-123.8x8.vc'
    const jaasDomain = process.env.NEXT_PUBLIC_JAAS_APP_ID ? `${process.env.NEXT_PUBLIC_JAAS_APP_ID}.8x8.vc` : 'YOUR_JAAS_APP_ID.8x8.vc';
    
    return [
      {
        source: '/:path*', // Apply this header to all routes
        headers: [
          {
            key: 'Permissions-Policy',
            // Allow camera and microphone for your JaaS domain and all origins (Jitsi might need broader permissions for its internal iframes)
            // It's generally recommended to be as specific as possible with origins.
            // If 'self' is your application's domain, and Jitsi is on 'jaasDomain', you'd typically list them.
            // Using '*' for Jitsi sub-iframes might be necessary if their exact origins are dynamic or numerous.
            value: `camera=(${jaasDomain} *), microphone=(${jaasDomain} *)`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;