#!/bin/bash
set -xe # Verbose output and exit with nonzero exit code if anything fails

# There are two OS used in travis (.travis.yml) and only one deploy is needed
if [ "$TRAVIS_OS_NAME" != "linux" ]; then
	echo "Skipping deploy for npm version != linux"
	exit 0
fi

SOURCE_BRANCH="master"

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    echo "Skipping deploy for a pull request"
    exit 0
fi

# Commits to other branches shouldn't try to deploy
if [ "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
    echo "Skipping deploy for a commit on non-master branch"
    exit 0
fi

# Save some useful information
REPO=`git config remote.origin.url`
SITE_REPO=git@github.com:iTowns/itowns.github.io.git
SHA=`git rev-parse --verify HEAD`
COMMIT_AUTHOR_EMAIL=`git show  --pretty=format:"%ae" -q`
COMMIT_AUTHOR_NAME=`git show  --pretty=format:"%an" -q`

# Give me the right to push/pull on itowns.github.io
chmod 600 ./deploy_key
eval `ssh-agent -s`
ssh-add ./deploy_key

# Clone the existing master for the website into out/
# (using master because https://help.github.com/articles/user-organization-and-project-pages/)
git clone $SITE_REPO --single-branch --branch master out

# We're going to rewrite all the content of out/itowns

# Remove everything then recreate the content, to avoid keeping stale files
if [ -d out/itowns ]; then
    pushd out
    git rm -rf itowns
    popd
fi

mkdir -p out/itowns/dist

# Copy build results
cp -R dist/*.js out/itowns/dist/
# generate the API documentation
npm run doc -- -d out/itowns/docs

# Copy examples
cp -R examples out/itowns/

# Deleting the JS files in examples/layers
#git rm -f examples/layers/\ *.js

# Now let's go have some fun with the cloned repo
cd out
git config user.name "$COMMIT_AUTHOR_NAME"
git config user.email "$COMMIT_AUTHOR_EMAIL"

# Commit the "changes", i.e. the new version.
git add itowns
git commit -m "Deploy from itowns to GitHub Pages: ${SHA}"

# Now that we're all set up, we can push.
git push $SITE_REPO

# clean key
cd ..
rm ./deploy_key

# See https://github.com/travis-ci/travis-ci/issues/8082#issuecomment-315151953
ssh-agent -k
