const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

const mode = process.env.NODE_ENV;
const noInline = process.env.noInline;
const debugBuild = mode === 'development';

// For each file, this config is merged with its local babel configuration.
// See https://babeljs.io/docs/configuration#how-babel-merges-config-items
const babelConf = {
    rootMode: 'upward',
    plugins: [
        ['minify-replace', {
            replacements: [{
                identifierName: '__DEBUG__',
                replacement: {
                    type: 'booleanLiteral',
                    value: debugBuild,
                },
            }],
        }],
    ],
};

const include = [
    path.resolve(__dirname, 'packages/Geographic/src'),
    path.resolve(__dirname, 'packages/Main/src'),
    path.resolve(__dirname, 'packages/Debug/src'),
    path.resolve(__dirname, 'packages/Widgets/src'),
];

// excludes path to externalize
const excludesToExternals = [path.resolve(__dirname, 'packages/Main/src/Loader')];

const exclude = [
    path.resolve(__dirname, '.git'),
    path.resolve(__dirname, 'node_modules'),
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

    const sharedConfig = {
        mode,
        context: path.resolve(__dirname),
        resolve: {
            extensions: ['.ts', '.js'],
            extensionAlias: {
                '.js': ['.ts', '.js'],
            },
            alias: {
                itowns: path.resolve(__dirname, 'packages/Main/src/Main.js'),
                '@itowns/geographic': path.resolve(__dirname, 'packages/Geographic/src/index.ts'),
            },
        },
        entry: {
            itowns: [
                'core-js',
            ],
            debug: {
                import: './packages/Debug/src/Main.js',
                dependOn: 'itowns',
            },
            itowns_widgets: {
                import: './packages/Widgets/src/Main.js',
                dependOn: 'itowns',
            },
            itowns_potree2worker: {
                import: './packages/Main/src/Worker/Potree2Worker.js',
            },
            itowns_lasworker: {
                import: './packages/Main/src/Worker/LASLoaderWorker.js',
            },
        },
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
        },
        module: {
            rules: [
                {
                    test: /\.(js|ts)$/,
                    exclude,
                    include,
                    use: babelLoaderOptions,
                },
            ],
        },
    };

    // UMD
    const configUMD = {
        ...sharedConfig,
        entry: {
            ...sharedConfig.entry,
            itowns: [
                'core-js',
                './packages/Main/src/MainBundle.js',
            ],
        },
        output: {
            ...sharedConfig.output,
            filename: '[name].umd.js',
            library: '[name]',
            libraryTarget: 'umd',
            umdNamedDefine: true,
        },
    };

    // ESM
    const configESM = {
        ...sharedConfig,
        entry: {
            ...sharedConfig.entry,
            itowns: [
                'core-js',
                './packages/Main/src/Main.js',
            ],
        },
        output: {
            ...sharedConfig.output,
            filename: '[name].js',
            libraryTarget: 'module',
        },
        resolve: {
            ...sharedConfig.resolve,
            fallback: {
                os: false,
                fs: false,
                zlib: false,
                http: false,
                tty: false,
                url: false,
                util: false,
                child_process: false,
                module: false,
                'node:modules': false,
                path: false,
                'https-browserify': false,
                https: false,
                stream: false,
            },
        },
        plugins: [
            new ESLintPlugin({
                files: include,
            }),
        ],
        experiments: {
            outputModule: true,
        },
        externals: [
            ({ context, request }, callback) => {
                if (request === 'three' && !excludesToExternals.find(p => context.includes(p))) {
                    return callback(null, 'three');
                }
                callback();
            },
        ],
    };

    if (process.env.WEBPACK_SERVE) {
        configESM.devServer = {
            hot: false,
            devMiddleware: {
                publicPath: '/dist/',
            },
            static: {
                directory: path.resolve(__dirname, './'),
                watch: {
                    ignored: exclude,
                },
            },
            client: {
                overlay: {
                    errors: true,
                    runtimeErrors: false,
                    warnings: false,
                },
            },
        };

        return configESM;
    } else {
        return [configESM, configUMD];
    }
};
