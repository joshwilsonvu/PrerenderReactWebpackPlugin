const webpack = require("webpack");
const config = require("./webpack.config");

describe("Prerender React Webpack Plugin", () => {
  test("runs", done => {

    let compiler = webpack(config);
    compiler.run((err, stats) => {
      expect(err).toBeFalsy();
      expect(stats.hasErrors() && stats.toString()).toBe(false);
      console.log(stats.toString());
      done();
    }, 10000);
  });

});


