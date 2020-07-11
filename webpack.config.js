/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  console.debug('*** Webpack mode', mode);
  const isDevMode = mode === 'development';

  return {
    mode,

    devtool: isDevMode ? 'cheap-module-eval-source-map' : 'source-map',

    resolve: {
      extensions: ['.ts', '.js'],
    },

    entry: {
      'corozo-browser': ['./packages/browser/src/index.ts'],
    },

    output: {
      path: path.resolve('dist'),
      publicPath: '/',
      filename: '[name].js',
      chunkFilename: '[id].chunk.js',
      library: 'corozo',
      libraryTarget: 'umd',
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          enforce: 'pre',
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
    },

    plugins: [new CopyPlugin({ patterns: ['package.json', 'README.md', 'LICENSE'] }), new ForkTsCheckerPlugin()],
  };
};
