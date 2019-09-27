const webpack = require("webpack");
const merge = require("webpack-merge");
const config = require("./webpack.config");
const util = require("./util");

const multiEntry = merge(config, {
  entry: {
    basic: "./basic.js",
    stateful: "./stateful.js",
    styled: "./styled.js"
  }
});

describe("a multi page React app", () => {
  test("runs", () => {
    let compiler = webpack(multiEntry);
    return util.runCompiler.call(this, compiler);
  }, 10000);
});
