#!/bin/bash
set -xe # Verbose output and exit with nonzero exit code if anything fails

# There are two npm versions used in travis (.travis.yml)
# and only one deploy is needed
if [ "$TRAVIS_NODE_VERSION" != "4" ]; then
	echo "Skipping deploy for npm version != 4"
	exit 0
fi

SOURCE_BRANCH="master"
TARGET_BRANCH="gh-pages"

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
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`
COMMIT_AUTHOR_EMAIL=`git show  --pretty=format:"%ae" -q`
COMMIT_AUTHOR_NAME=`git show  --pretty=format:"%an" -q`

# Clone the existing gh-pages for this repo into out/
git clone $REPO --single-branch --branch $TARGET_BRANCH out

pushd out
# Remove everything then recreate the content, to avoid keeping stale files
git rm -rf dist index.html API_Doc
popd
# Copy build results
cp -R dist out/
# generate the API documentation
npm run doc -- -d out/API_Doc
# Copy demo
cp index.html out/
# Copy the decoded deploy key (decoding made with openssl command in .travis.yml)
cp deploy_key out/

# Now let's go have some fun with the cloned repo
cd out
git config user.name "$COMMIT_AUTHOR_NAME"
git config user.email "$COMMIT_AUTHOR_EMAIL"

# Commit the "changes", i.e. the new version.
git add dist index.html API_Doc
git commit -m "Deploy to GitHub Pages: ${SHA}"

chmod 600 deploy_key
eval `ssh-agent -s`
ssh-add deploy_key
# Now that we're all set up, we can push.
git push $SSH_REPO $TARGET_BRANCH
