const {SyncHook} = require('tapable');
const webpack = require('webpack');
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
let HtmlWebpackPlugin; // optional dependency
try {
  HtmlWebpackPlugin = require('html-webpack-plugin');
} catch (e) {
  if (!(e instanceof Error) || e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }
}

const name = 'PrerenderReactWebpackPlugin';

class PrerenderReactWebpackPlugin {
  constructor(options = {}) {
    this.chunks = options.chunks || []; // the chunks to prerender, e.g. "main"
    this.assets = []; // filenames that would be emitted
    this.emit = options.emit || false; // whether to emit the prerendering cjs modules
    this.hooks = {
      prerendered: new SyncHook(['defaultExport'])
    };
  }

  apply(parentCompiler) {
    const makeHook = this.makeHook.bind(this);
    const emitHook = this.emitHook.bind(this);
    const hwpHook = this.hwpHook.bind(this);
    if (parentCompiler.hooks) {
      parentCompiler.hooks.make.tapAsync(name, makeHook);
      parentCompiler.hooks.emit.tapAsync(name, emitHook);
    } else {
      parentCompiler.plugin('make', makeHook);
      parentCompiler.plugin('emit', emitHook); // TODO won't work with promise
    }

    if (HtmlWebpackPlugin && HtmlWebpackPlugin.getHooks) {
      // HtmlWebpackPlugin >= 4
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tap(name, hwpHook);
    } else if (compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration) {
      // HtmlWebpackPlugin 3
      compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync(name, beforeHtmlGeneration);
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
    this.entryPlugins(childCompiler.context).apply(childCompiler);

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

    childCompiler.runAsChild(err => {
      done(err);
    });
  }

  emitHook(compilation, done) {
    const stats = compilation.getStats().toJson();
    // Get our output asset
    Promise.all(this.data.map(({chunk, asset: assetFile, entry}) => {
      const asset = compilation.getAsset(assetFile);
      if (!asset) {
        compilation.errors.push(new Error(`Asset ${assetFile} not found.`));
        return;
      }
      if (!this.emit) {
        // require the generated module and extract the prerendered HTML
        const sourceString = asset.source.source(); // asset.source is Source object (see webpack-sources)
        let sourceExports;
        try {
          sourceExports = requireFromString(sourceString);
        } catch (error) {
          compilation.errors.push(error);
          return;
        }
        if (!sourceExports || !sourceExports.default) {
          compilation.errors.push(new Error(`Missing default export from prerendered chunk ${chunk}`));
          return;
        }
        // should be an HTML snippet or an object of template parameters
        let defaultExport = sourceExports.default;
        if (typeof defaultExport === 'function') {
          defaultExport = defaultExport();
        }
        return Promise.resolve(defaultExport).then(defaultExport => { // handle async export
          // Delete our asset from output, we got the string we wanted
          delete compilation.assets[assetFile];

          // Call any plugin tapped into the prerendered hook
          this.hooks.prerendered.call(defaultExport);
        });
      }
    })).then(() => done());
  }

  hwpHook(compilation) {
    if (HtmlWebpackPlugin && HtmlWebpackPlugin.getHooks) {
      // HtmlWebpackPlugin >= 4
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tap(
        name,
        function cb(data, callback) {
          var processTag = self.processTag.bind(self, hwpCompilation);
          data.assetTags.scripts.filter(util.filterTag).forEach(processTag);
          data.assetTags.styles.filter(util.filterTag).forEach(processTag);
          callback(null, data);
        }
      );
    } else if (compilation.hooks.htmlWebpackPluginAlterAssetTags &&
      compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration) {
      // HtmlWebpackPlugin 3
      compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync(name, beforeHtmlGeneration);
    }
  }

  /**
   * Initialize this.data with the information needed to keep track of entry points and outgoing
   * assets. If the array this.options.chunks is present, only prerender those chunks; default to
   * prerendering all chunks.
   *
   * chunk: string = chunk name, ex. main, etc.
   * asset: string = output filename, ex. chunk.prerender.js
   * entry: string | Array<string> = entry point or points, ex. index.js
   *
   * @param entry the entry point given in the parent compiler's options
   */
  prepareData(entry) {
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

  // For each object in this.data, apply a Single/MultiEntryPlugin to the compiler
  entryPlugins(context) {
    const plugins = this.data.map(({chunk, entry}) => (
      new (Array.isArray(entry) ? MultiEntryPlugin : SingleEntryPlugin)(context, entry, chunk)
    ));
    return {
      apply(compiler) {
        plugins.forEach(plugin => plugin.apply(compiler));
      }
    };
  }
}

module.exports = PrerenderReactWebpackPlugin;