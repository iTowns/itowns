module.exports = (grunt) => {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bump: {
            options: {
                files: ['package.json', 'package-lock.json', 'src/Main.js'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'release v%VERSION%',
                commitFiles: ['package.json', 'package-lock.json', 'src/Main.js'],
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
