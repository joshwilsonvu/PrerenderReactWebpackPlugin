const webpack = require("webpack");
const merge = require("webpack-merge");
const config = require("./webpack.config");
const util = require("./util");

const styled = merge(config, {entry: ['./styled.js']});

describe("a React app with css-in-js", () => {
  test("runs", () => {
    let compiler = webpack(styled);
    return util.runCompiler.call(this, compiler);
  }, 10000);
});


