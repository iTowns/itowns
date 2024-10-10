const BABEL_ENV = process.env.BABEL_ENV;

const alias_itowns_geodesy = `../Geodesy/${BABEL_ENV == 'test' ? 'lib' : 'src'}/Main.js`;

module.exports = (api) => {
    api.cache(true);
    return {
        presets: [
            ['@babel/preset-typescript'],
            ['@babel/preset-env', {
                targets: {
                    browsers: "defaults and supports webgl2"
                },
                modules: false
            }]
        ],
        plugins: [
            ['module-resolver', {
                cwd: 'packagejson',
                root: ['./src'],
                extensions: [".js", ".ts", ".tsx"],
                alias: {
                    '@itowns/geodesy': alias_itowns_geodesy
                }
            }],
            ['babel-plugin-inline-import', {
                extensions: [
                    '.json',
                    '.geojson',
                    '.glsl',
                    '.css'
                ]
            }],
            ['module-extension-resolver', {
                srcExtensions: ['.ts', '.js']
            }],
            ['@babel/plugin-transform-runtime', {
                'regenerator': false
            }],
            ['minify-replace', {
                replacements: [{
                    identifierName: "__DEBUG__",
                    replacement: {
                        type: 'booleanLiteral',
                        value: false
                    }
                }]
            }],
            ['minify-dead-code-elimination']
        ]
    };
};