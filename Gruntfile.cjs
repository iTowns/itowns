module.exports = (grunt) => {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bump: {
            options: {
                files: ['package.json', 'package-lock.json', 'packages/Main/src/Main.js',
                    // 'packages/**/package.json'
                    'packages/Main/package.json',
                    'packages/Geodesy/package.json',
                    'packages/Widget/package.json',
                ],
                updateConfigs: [],
                commit: true,
                commitMessage: 'release v%VERSION%',
                commitFiles: ['package.json', 'package-lock.json',
                    // 'packages/**/package.json'
                    'packages/Main/package.json',
                    'packages/Geodesy/package.json',
                    'packages/Widget/package.json',
                ],
                createTag: false,
                tagName: 'v%VERSION%',
                tagMessage: 'Release %VERSION%.',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                metadata: '',
                regExp: false,
            },
        },
    });

    grunt.loadNpmTasks('grunt-bump');
};
