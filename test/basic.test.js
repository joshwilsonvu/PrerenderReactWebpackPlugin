const webpack = require("webpack");
const config = require("./webpack.config");
const util = require("./util");

const basic = config;

describe("a basic React app", () => {
  test("runs", () => {
    let compiler = webpack(config);
    return util.runCompiler.call(this, compiler);
  }, 10000);
});
