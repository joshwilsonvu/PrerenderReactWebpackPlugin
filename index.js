const tapable = require("tapable");
const webpack = require("webpack");
const { RawSource } = require("webpack-sources");
//const HtmlWebpackPlugin = require("html-webpack-plugin"); // peer dependency
const os = require("os");
const path = require("path");
const NodeTemplatePlugin = require("webpack/lib/node/NodeTemplatePlugin");
const NodeTargetPlugin = require("webpack/lib/node/NodeTargetPlugin");
const LibraryTemplatePlugin = require("webpack/lib/LibraryTemplatePlugin");
const SingleEntryPlugin = require("webpack/lib/SingleEntryPlugin");
const MultiEntryPlugin = require("webpack/lib/MultiEntryPlugin");

const name = "PrerenderReactWebpackPlugin";

class PrerenderReactWebpackPlugin {
  constructor(options = {}) {
    this.entry = options.entry;
    this.outputFileName = "main.prerender.js";
    this.outputPath = '.';
  }

  apply(parentCompiler) {
    parentCompiler.hooks.make.tapAsync(name, this.makeHook.bind(this));

    parentCompiler.hooks.emit.tap(name, this.emitHook.bind(this));
  }

  makeHook(compilation, done) {
    const parentCompiler = compilation.compiler;
    const parentOptions = parentCompiler.options;
    // directs output to prerender directory
    this.outputPath = path.join(parentOptions.output && parentOptions.output.path || ".", "..", "prerender");
    const outputOptions = {
      path: this.outputPath,
      filename: this.outputFileName,
      futureEmitAssets: true
    };
    const plugins = [];//(parentOptions.plugins || []).filter(p => p === this);

    // Create child compiler to compile a Node version of the React app
    let childCompiler = compilation.createChildCompiler("PrerenderReactChildCompiler", outputOptions, plugins);
    childCompiler.outputFileSystem = parentCompiler.outputFileSystem;
    childCompiler.context = parentCompiler.context;


    // Compile to CommonJS to be executed by Node
    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new LibraryTemplatePlugin(name, 'commonjs2').apply(childCompiler);

    // Add entry plugin to make all of this work
    this.entry = this.entry || parentOptions.entry; // default to all entry points
    applyEntry(childCompiler.context, this.entry, childCompiler);

    // Needed for HMR. Even if your plugin don't support HMR,
    // this code seems to be always needed just in case to prevent possible errors
    childCompiler.hooks.compilation.tap(name, compilation => {
      if (compilation.cache) {
        if (!compilation.cache[name]) {
          compilation.cache[name] = {};
        }
        compilation.cache = compilation.cache[name];
      }
    });

    childCompiler.runAsChild((err, entries, childCompilation) => {
      done(err);
    });
  }

  emitHook(compilation) {
    const stats = compilation.getStats().toJson();
    // Get our output asset
    const asset = compilation.getAsset(this.outputFileName);
/*
    // Delete our asset from output
    delete compilation.assets[this.outputFileName];

    // Collect all output assets
    const assets = Object.keys(compilation.assets);

    // Combine collected assets and child compilation output into new source.
    // Note: `globalAssets` is global variable
    let source = new RawSource([
      `var globalAssets = ${JSON.stringify(assets)}`,
      `${asset.source}`,
      ``
    ].join('\n'));

    // Add out asset back to the output
    compilation.emitAsset(this.outputFileName, source);
*/
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

function toObj(any) {
  if (!any) {
    return {};
  }
  if (typeof any === "string") {
    return [any];
  }
  return any
}

/** Handle "object", "string" and "array" types of entry */
function applyEntry(context, entry, compiler) {
  if (typeof entry === 'string' || Array.isArray(entry)) {
    itemToPlugin(context, entry, 'main').apply(compiler);
  } else if (typeof entry === 'object') {
    Object.keys(entry).forEach(name => {
      itemToPlugin(context, entry[name], name).apply(compiler);
    });
  }
}

function itemToPlugin(context, item, name) {
  if (Array.isArray(item)) {
    return new MultiEntryPlugin(context, item, name);
  }
  return new SingleEntryPlugin(context, item, name);
}


module.exports = PrerenderReactWebpackPlugin;