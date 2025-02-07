module.exports = (grunt) => {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bump: {
            options: {
                files: ['package.json', 'package-lock.json', 'packages/Main/src/Main.js',
                    'packages/Main/package.json',
                    'packages/Geographic/package.json',
                    'packages/Widgets/package.json',
                    'packages/Debug/package.json',
                ],
                updateConfigs: [],
                commit: true,
                commitMessage: 'release v%VERSION%',
                commitFiles: ['package.json', 'package-lock.json',
                    'packages/Main/package.json',
                    'packages/Geographic/package.json',
                    'packages/Widgets/package.json',
                    'packages/Debug/package.json',
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
