const webpack = require("webpack");

module.exports.runCompiler = function(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }
      if (stats.hasErrors() || stats.hasWarnings()) {
        return reject(stats.toJson('errors-warnings'));
      }
      return resolve(stats);
    });
  });
};