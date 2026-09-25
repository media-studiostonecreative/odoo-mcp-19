/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Never expose Odoo credentials to the client bundle. Only NEXT_PUBLIC_*
  // vars are ever inlined by Next.js, and none are declared — this comment
  // documents the invariant, it does not enforce it by itself.
};

export default nextConfig;
