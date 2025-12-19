import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "https://9000-firebase-klaru-main-1763847520239.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev",
        "*.cloudworkstations.dev",
        "localhost:3000"
      ]
    }
  },
  // Keep legacy key for older Next.js versions just in case, though serverActions.allowedOrigins is the correct one for actions
  allowedDevOrigins: [
    "https://6000-firebase-studio-1763805159845.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev",
    "https://9000-firebase-klaru-main-1763847520239.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev"
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
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
        protocol: 'https' ,
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
