const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');

const mode = process.env.NODE_ENV;
const noInline = process.env.noInline;
const debugBuild = mode === 'development';

/*
   configuring babel:
   - when babel runs alone (for `test-unit` for instance), we let him deal with
   ES6 modules, because node doesn't support them yet (planned for v10 lts).
   - however, webpack also has ES6 module support and these 2 don't play well
   together. When running webpack (either `build` or `start` script), we prefer
   to rely on webpack loaders (much more powerful and gives more possibilities),
   so let's disable modules for babel here.
   - we also dynamise the value of __DEBUG__ according to the env var
*/
// Note that we don't support .babelrc in parent folders
const babelrc = fs.readFileSync(path.resolve(__dirname, '.babelrc'));
const babelConf = JSON.parse(babelrc);

babelConf.babelrc = false; // disabel babelrc reading, as we've just done it
const replacementPluginConf = babelConf.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'minify-replace');
replacementPluginConf[1].replacements.find(decl => decl.identifierName === '__DEBUG__').replacement.value = debugBuild;

const include = [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'test'),
];

module.exports = () => {
    const babelLoaderOptions = [];
    if (!noInline) {
        babelLoaderOptions.push('babel-inline-import-loader');
    }
    babelLoaderOptions.push({
        loader: 'babel-loader',
        options: babelConf,
    });

    return {
        mode,
        context: path.resolve(__dirname),
        resolve: {
            modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        },
        entry: {
            itowns_geodesy: [
                'core-js',
                './src/Main.js',
            ],
        },
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            library: '[name]',
            libraryTarget: 'umd',
            umdNamedDefine: true,
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: path.resolve(__dirname, '/node_modules/'),
                    include,
                    use: babelLoaderOptions,
                },
            ],
        },
        plugins: [
            new ESLintPlugin({
                files: include,
            }),
            // Prevent the generation of module fs for import on copc dependency
            // See https://webpack.js.org/plugins/ignore-plugin/
            new webpack.IgnorePlugin({
                resourceRegExp: /^fs$/,
                contextRegExp: /copc/,
            }),
        ],
    };
};
