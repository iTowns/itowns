'use strict';

var path = require('path');
var fs = require('fs');
var base = require('./webpack.config.js');

module.exports = function(config) {
    config.set({
        browsers: ['Firefox'],
        frameworks:['mocha'],
        files: [
            'test/**/*.js',
            {pattern: 'data/**/*', watched: false, included: false, served: true, nocache: false}
        ],
        proxies: {
            '/data/': '/base/data/'
        },
        preprocessors: {
            'test/**/*.js': ['webpack', 'sourcemap']
        },
        webpack: Object.assign({}, base, {
            devtool: 'inline-source-map'
        }),
        // Bump timeout for CI: https://docs.travis-ci.com/user/gui-and-headless-browsers/
        browserNoActivityTimeout: 30000
    });
};
