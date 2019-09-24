const webpack = require("webpack");
const config = require("./webpack.config");

jest.mock("fs");

describe("Prerender React Webpack Plugin", () => {
  test("runs", done => {
    let compiler = webpack(config);
    compiler.run((err, stats) => {
      expect(err).toBeFalsy();
      expect(stats.hasErrors() && stats.toString()).toBe(false);
      done();
    }, 10000);
  });

});


