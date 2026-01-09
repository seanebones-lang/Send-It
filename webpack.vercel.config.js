const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    chunkFilename: 'js/[name].[contenthash].chunk.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    fallback: {
      // Polyfills for Node.js modules not available in browser
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      process: false,
    },
  },
  externals: {
    // Exclude Electron-only dependencies from browser build
    'better-sqlite3': 'commonjs better-sqlite3',
    'sqlite3': 'commonjs sqlite3',
    'keytar': 'commonjs keytar',
    'simple-git': 'commonjs simple-git',
    'electron': 'commonjs electron',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              noEmit: false,
            },
            onlyCompileBundledFiles: true,
          },
        },
        include: [
          path.resolve(__dirname, 'src/renderer'),
        ],
        exclude: [
          /node_modules/,
          /\.test\./,
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: require('./postcss.config.js'),
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    new webpack.DefinePlugin({
      'process.env.BUILD_TARGET': JSON.stringify('web'),
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
        tanstack: {
          test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
          name: 'tanstack',
          chunks: 'all',
          priority: 15,
        },
      },
    },
    runtimeChunk: 'single',
  },
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: 'warning',
  },
};
