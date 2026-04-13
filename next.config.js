/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ANTHROPIC_KEY_A: process.env.ANTHROPIC_KEY_A || 'sk-ant-api03-2JSL9va30VT5Gh-P1vYtTw3NbXZasIV3h6cWUZUaNeP6MzDl73Ogyu6-kf2GDfOa',
    ANTHROPIC_KEY_B: process.env.ANTHROPIC_KEY_B || 'QPTux5KrK3QJb1zEydG_WA-VX5J0QAA',
  },
};

module.exports = nextConfig;
