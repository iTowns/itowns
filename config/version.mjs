import { execSync } from 'child_process';

// This script is used to "augment" the default behavior of npm version by
// recursively updating the version of all packages in the workspace. It also
// runs the changelog package script.
//
// It also adds the package.json and changelog.md files to the git index if the
// --no-git-tag-version flag is not set. Those will be committed at the end of
// the npm version command.

const {
    npm_config_git_tag_version = 'false', // no arg <=> --no-git-tag-version false
    npm_package_version, // not undefined by npm version command
} = process.env;

try {
    execSync(`npm version ${npm_package_version} --workspaces`, {
        stdio: 'inherit',
    });
} catch (error) {
    process.exit(error.status);
}

try {
    execSync(`npm run changelog`, {
        stdio: 'inherit',
    });
} catch (error) {
    process.exit(error.status);
}

if (npm_config_git_tag_version === 'false') {
    try {
        execSync('git add packages/**/package.json changelog.md', {
            stdio: 'inherit'
        });
    } catch (error) {
        process.exit(error.status);
    }
}