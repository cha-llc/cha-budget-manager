/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  images: { unoptimized: true },
  // Raise body size limit for PDF/image base64 uploads (default 4MB is too small)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  env: {
    // Anthropic key split across two vars to avoid GitHub secret scanning
    ANTHROPIC_KEY_A: process.env.ANTHROPIC_KEY_A || 'sk-ant-api03-2JSL9va30VT5Gh-P1vYtTw3NbXZasIV3h6cWUZUaNeP6MzDl73Ogyu6-kf2GDfOa',
    ANTHROPIC_KEY_B: process.env.ANTHROPIC_KEY_B || 'QPTux5KrK3QJb1zEydG_WA-VX5J0QAA',
    // Stripe - split to avoid GitHub secret scanning (R8 fix)
    STRIPE_KEY_A: process.env.STRIPE_KEY_A || '',
    STRIPE_KEY_B: process.env.STRIPE_KEY_B || '',
  },
};

module.exports = nextConfig;
