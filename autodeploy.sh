#!/bin/bash
set -xe # Verbose output and exit with nonzero exit code if anything fails

# There are two npm versions used in travis (.travis.yml)
# and only one deploy is needed
if [ "$TRAVIS_NODE_VERSION" != "node" ]; then
	echo "Skipping deploy for npm version != node"
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

# Clone the existing master for the website into out/
# (using master because https://help.github.com/articles/user-organization-and-project-pages/)
git clone $SITE_REPO --single-branch --branch master out

# We're going to rewrite all the content of out/itowns2

# Remove everything then recreate the content, to avoid keeping stale files
if [ -d out/itowns2 ]; then
    pushd out
    git rm -rf itowns2
    popd
fi

mkdir -p out/itowns2/dist

# Copy build results
cp -R dist/*.js out/itowns2/dist/
# generate the API documentation
npm run doc -- -d out/itowns2/API_Doc

# Copy demo
mkdir -p out/itowns2/node_modules/dat.gui/build/
cp node_modules/dat.gui/build/dat.gui.min.js out/itowns2/node_modules/dat.gui/build/
# Copy examples
cp -R examples out/itowns2/
# Copy the decoded deploy key (decoding made with openssl command in .travis.yml)
cp deploy_key out/itowns2/
# Deleting the JS files in examples/layers
#git rm -f examples/layers/\ *.js

# Now let's go have some fun with the cloned repo
cd out
git config user.name "$COMMIT_AUTHOR_NAME"
git config user.email "$COMMIT_AUTHOR_EMAIL"

# Commit the "changes", i.e. the new version.
git add itowns2
git commit -m "Deploy from itowns2 to GitHub Pages: ${SHA}"

chmod 600 itowns2/deploy_key
eval `ssh-agent -s`
ssh-add itowns2/deploy_key
# Now that we're all set up, we can push.
git push $SITE_REPO
