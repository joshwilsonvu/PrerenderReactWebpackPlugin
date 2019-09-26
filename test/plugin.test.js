const webpack = require("webpack");
const merge = require("webpack-merge");
const path = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const PrerenderWebpackPlugin = require("../index");

const basicConfig = {
  context: path.resolve(__dirname, "src"),
  entry: { basic: "./basic.js" },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    futureEmitAssets: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  /*optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          chunks: "all"
        }
      }
    }
  },*/
  plugins: [
    new CleanWebpackPlugin(),
    //new HtmlWebpackPlugin(),
    new PrerenderWebpackPlugin(),
  ],
  stats: "minimal"
};
const devConfig = merge(basicConfig, {mode: "development"});
const prodConfig = merge(basicConfig, {mode: "production"});
const multiEntryConfig = merge(devConfig, {
  entry: {
    basic: "./basic.js",
    stateful: "./stateful.js",
    styled: "./styled.js"
  }
});

const runCompiler = compiler => new Promise((resolve, reject) => {
  compiler.run((err, stats) => {
    if (err) {
      return reject(err);
    }
    if (stats.hasErrors()) {
      return reject(stats.toString());
    }
    return resolve(stats);
  });
});

describe.each([
  ["development", devConfig],
  ["production", prodConfig],
  ["multiple entry", multiEntryConfig],
])("with '%s' configuration", (_, config) => {
  test("runs", () => {
    let compiler = webpack(config);
    const fs = compiler.outputFileSystem;
    return runCompiler(compiler);
  }, 10000);
});
