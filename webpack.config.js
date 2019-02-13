const path = require('path');
const env = process.env.NODE_ENV || 'production';
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

//used to minimize .js
const minimizer = new TerserPlugin({
    cache: false,
    parallel: true,
    sourceMap: true,
    terserOptions: {
      // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
    }
})

WebpackConfig = {
    // will generate index.js from src/js/main.js
    entry: {
        index: ['./src/js/main.js'],
    },
    // will minimize when mode = development
    mode: env,
    // output options
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    // handle loader for each file type
    module: {
        rules: [
        // .css
        {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        },
        // the following is need to createjs to work ( dont ask me why)
        {
            test: /node_modules[/\\]createjs/,
            loaders: [
              'imports-loader?this=>window',
              'exports-loader?window.createjs'
            ]
          },
        ]
    },
    plugins: [

    ],
    resolve: {
        alias: {
          // needed to import createjs
          createjs: 'createjs/builds/1.0.0/createjs.js',
          // shortcut aliases
          '@root': path.resolve('./'),
          '@src': path.resolve('./src/'),
          '@css': path.resolve('./src/css/'),
          '@js': path.resolve('./src/js/'),
          '@asset': path.resolve('./src/assets/'),
        }
    },
    // use source-map for dev
    devtool: env == 'development' ? 'cheap-eval-source-map' : false,
    // define optimization (production env only)
    optimization: {
        minimizer: env == 'production' ? [minimizer] : [],
    },
};

if(env == 'production') {
    WebpackConfig.plugins.push(new CompressionPlugin());
}

module.exports = WebpackConfig;