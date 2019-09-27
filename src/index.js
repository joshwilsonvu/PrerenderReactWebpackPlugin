const tapable = require('tapable');
const webpack = require('webpack');
const {RawSource} = require('webpack-sources');
const nodeExternals = require('webpack-node-externals');
//const HtmlWebpackPlugin = require("html-webpack-plugin"); // peer dependency
const os = require('os');
const path = require('path');
const requireFromString = require('require-from-string');
const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const MultiEntryPlugin = require('webpack/lib/MultiEntryPlugin');

const name = 'PrerenderReactWebpackPlugin';

class PrerenderReactWebpackPlugin {
  constructor(options = {}) {
    this.chunks = options.chunks || []; // the chunks to prerender, e.g. "main"
    this.assets = []; // filenames that would be emitted
  }

  apply(parentCompiler) {
    if (parentCompiler.hooks) {
      parentCompiler.hooks.make.tapAsync(name, this.makeHook.bind(this));
      parentCompiler.hooks.emit.tap(name, this.emitHook.bind(this));
    } else {
      parentCompiler.plugin('make', this.makeHook.bind(this));
      parentCompiler.plugin('emit', this.emitHook.bind(this));
    }
  }

  makeHook(compilation, done) {
    const parentCompiler = compilation.compiler;
    const parentOptions = parentCompiler.options;

    // compilation-specific configuration
    this.prepareData(parentOptions.entry);

    const outputOptions = {
      filename: '[name].prerender.js', // file format mapping chunks to assets
      futureEmitAssets: true
    };

    // Only copy over allowed plugins (from prerender-loader)
    const plugins = (parentOptions.plugins || []).filter(c => /(MiniCssExtractPlugin|ExtractTextPlugin)/i.test(c.constructor.name));

    // Create child compiler to compile a Node version of the app
    let childCompiler = compilation.createChildCompiler('PrerenderReactChildCompiler', outputOptions, plugins);
    childCompiler.outputFileSystem = parentCompiler.outputFileSystem;
    childCompiler.context = parentCompiler.context;
    // don't bundle node_modules
    childCompiler.options.externals = (childCompiler.options.externals || []).concat(nodeExternals());

    // Compile to CommonJS to be executed by Node
    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);
    new LibraryTemplatePlugin(name, 'commonjs2').apply(childCompiler);

    // Add entry plugins to make all of this work
    entryPlugins(childCompiler.context).apply(childCompiler);

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
    this.data.forEach(({chunk, asset, entry}) => {
      // TODO
    })
    const asset = compilation.getAsset(this.fileName);
    if (!asset) {
      compilation.errors.push(new Error(`Asset ${this.fileName} not found.`));
      return;
    }
    // asset.source is a Source object (see webpack-sources)
    const sourceString = asset.source.source();
    let prerenderedHtml;
    try {
      const doPrerender = requireFromString(sourceString).default; // get default export of entry file
      prerenderedHtml = doPrerender();
    } catch (error) {
      compilation.errors.push(error);
      return;
    }
    console.log(prerenderedHtml.slice(0, 1000));

    // Delete our asset from output, we got the string we wanted
    delete compilation.assets[this.fileName];

    /*
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
    compilation.emitAsset(this.fileName, source);

 */
  }

  /**
   * Initialize this.data with the information needed to keep track of entry points and outgoing
   * assets. If the array this.options.chunks is present, only prerender those chunks; default to
   * prerendering all chunks.
   *
   * @param entry the entry point given in the parent compiler's options
   */
  prepareData(entry) {
    // {
    //   chunk: string = chunk name, ex. main, etc.
    //   asset: string = output filename, ex. chunk.prerender.js
    //   entry: string | Array<string> = entry point or points, ex. index.js
    // }
    if (typeof entry === 'string' || Array.isArray(entry)) {
      this.data = [{
        chunk: 'main',
        asset: 'main.prerender.js',
        entry: entry
      }];
    } else {
      this.data = Object.keys(entry).map(chunk => ({
        chunk,
        asset: `${chunk}.prerender.js`,
        entry: entry[chunk]
      }));
      if (Array.isArray(this.chunks) && this.chunks.length) {
        this.data = this.data.filter(({chunk}) => this.chunks.indexOf(chunk) !== -1);
      }
    }
  }
}

/** Handle "object", "string" and "array" types of entry */
function entryPlugins(context) {
  // For each object in this.data, apply a Single/MultiEntryPlugin to the compiler
  const plugins = this.data.map(({chunk, asset, entry}) => (
    new (Array.isArray(entry) ? MultiEntryPlugin : SingleEntryPlugin)(context, entry, chunk)
  ));
  return {
    apply(compiler) {
      plugins.forEach(plugin => plugin.apply(compiler));
    }
  };
}

// figures out which chunks to prerender, defaults to all
function getChunks(entry, parentOptions) {
  let parentEntry = parentOptions.entry;
  let assets = (typeof parentEntry === 'string' || Array.isArray(parentEntry)) ? ['main'] : Object.keys(parentEntry);
  if (Array.isArray(entry) && entry.length) {
    assets = assets.filter(a => entry.indexOf(a) !== -1);
  }
  return assets;
}


module.exports = PrerenderReactWebpackPlugin;