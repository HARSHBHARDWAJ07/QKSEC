

const repoName = 'QKSEC';
// Only GitHub Pages serves this app from a /QKSEC subpath; Render (and local dev)
// serve it from the domain root, so this must not key off NODE_ENV alone.
const isGithubPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: isGithubPages ? `/${repoName}` : '',
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  images: { unoptimized: true },
  trailingSlash: true,
  distDir: 'out',
};

module.exports = nextConfig;