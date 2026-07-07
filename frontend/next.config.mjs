/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Old mixed-site routes → new client/admin split
    return [
      { source: '/listings', destination: '/browse', permanent: true },
      { source: '/listings/:id', destination: '/browse/:id', permanent: true },
      { source: '/guidance', destination: '/', permanent: true },
      { source: '/crm', destination: '/admin/leads', permanent: true },
      { source: '/market', destination: '/admin/market', permanent: true },
    ];
  },
};

export default nextConfig;
