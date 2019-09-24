const tapable = require("tapable");
const webpack = require("webpack");
//const HtmlWebpackPlugin = require("html-webpack-plugin"); // peer dependency
const os = require("os");
const path = require("path");
const NodeTemplatePlugin = require("webpack/lib/node/NodeTemplatePlugin");
const NodeTargetPlugin = require("webpack/lib/node/NodeTargetPlugin");
const LibraryTemplatePlugin = require("webpack/lib/LibraryTemplatePlugin");


class PrerenderReactWebpackPlugin {
  apply(compiler) {
    compiler.hooks.make.tap({ name: "PrerenderReactWebpackPlugin" }, compilation => {
      if (!compilation.parentCompilation) {
        console.log("The compiler has almost finished the compilation");
        const compiler = compilation.compiler;
        const context = compiler.options.context || process.cwd();
        const entry = universalMap(compiler.options.entry, entry => path.join(compiler.options.context, entry));
        const outputOptions = {
          path: "./prerender",
        };

        const plugins = (compiler.options.plugins || []).filter(p => p.constructor.name !== this.constructor.name);
        const childCompiler = compilation.createChildCompiler('prerender', outputOptions, plugins);
        childCompiler.context = context;
        childCompiler.outputFileSystem = compiler.outputFileSystem;

        // Compile to CommonJS to be executed by Node
        new NodeTemplatePlugin(outputOptions).apply(childCompiler);
        new NodeTargetPlugin().apply(childCompiler);
        new LibraryTemplatePlugin('PRERENDER_REACT_WEBPACK_PLUGIN_RESULT', 'var').apply(compiler);

        console.log("Running child compiler");
        childCompiler.run();
      }
    });
  }


}
/*
async function compileToNode(parentCompilation, options) {
  const parentCompiler = getRootCompiler(parentCompilation.compiler);
  const context = parentCompiler.options.context || process.cwd();
  const entry = convertPathToRelative(context, parentCompiler.options.entry, './');

  const outputOptions = {
    path: os.tmpdir(),
    filename: "prerender-react-bundle.js"
  };

  // Copy over all plugins
  const plugins = parentCompiler.options.plugins || [];

  // Compile to an in-memory filesystem since we just want the resulting bundled code as a string
  const compiler = parentCompilation.createChildCompiler('prerender', outputOptions, plugins);
  compiler.context = parentCompiler.context;
  compiler.outputFileSystem = new MemoryFs();

  new DefinePlugin({
    PRERENDER_REACT: "true"
  }).apply(compiler);

  new DefinePlugin({
    PRERENDER_REACT: "false"
  }).apply(parentCompiler);

  // Compile to CommonJS to be executed by Node
  new NodeTemplatePlugin(outputOptions).apply(compiler);
  new NodeSourcePlugin().apply(compiler);
  new NodeTargetPlugin().apply(compiler);

  new LibraryTemplatePlugin('PRERENDER_REACT_WEBPACK_PLUGIN_RESULT', 'var').apply(compiler);




}
*/

function universalMap(obj, fun) {
  if (Array.isArray(obj)) {
    return obj.map(fun);
  }
  if (obj && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = fun(obj[key]);
      return acc;
    }, {});
  }
  return fun(obj);
}

module.exports = PrerenderReactWebpackPlugin;