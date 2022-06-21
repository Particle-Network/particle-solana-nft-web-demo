/* eslint-disable */
const withPlugins = require('next-compose-plugins');
const withImages = require('next-images');
const withLess = require('next-with-less');

const plugins = [
  withImages,
  [
    withLess,
    {
      lessLoaderOptions: {
        lessOptions: {
          javascriptEnabled: true,
        },
      },
    },
  ],
];

module.exports = withPlugins(plugins, {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    loader: 'custom',
  },
  webpack(config) {
    return config;
  },
});
