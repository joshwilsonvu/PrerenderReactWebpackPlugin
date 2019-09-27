const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const PrerenderWebpackPlugin = require("../src/index");

module.exports = {
  mode: "development",
  context: path.resolve(__dirname, "src"),
  entry: {basic: "./basic.js"},
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
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    //new HtmlWebpackPlugin(),
    new PrerenderWebpackPlugin({
      emit: false,

    }),
  ],
};