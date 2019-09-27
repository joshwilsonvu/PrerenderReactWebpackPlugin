const webpack = require("webpack");
const merge = require("webpack-merge");
const config = require("./webpack.config");
const util = require("./util");

const stateful = merge(config, {entry: {stateful: './stateful.js'}});

describe("a stateful React app", () => {
  test("runs", () => {
    let compiler = webpack(stateful);
    return util.runCompiler.call(this, compiler);
  }, 10000);
});
