var path = require('path');

var commonConfig = require('./webpack-common.config.js');

module.exports = {
    output: {
        libraryTarget: 'commonjs2',
        umdNamedDefine: true,
    },
    module: {
        rules: [
            commonConfig.glslLoader,
            commonConfig.jsonLoader,
        ],
    },
};
