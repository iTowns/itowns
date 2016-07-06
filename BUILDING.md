# Build guide

## Environment setup

### GitHub

iTowns is managed on the GitHub platform. You should start with [creating a GitHub account](https://github.com/signup/free).

### Git

* Setup Git if it isn't already ([link](https://help.github.com/articles/set-up-git/#platform-all)).
   * Make sure your SSH keys are configured ([linux](https://help.github.com/articles/generating-ssh-keys#platform-linux) | [mac](https://help.github.com/articles/generating-ssh-keys#platform-mac) | [windows](https://help.github.com/articles/generating-ssh-keys#platform-windows)).
   * Double-check your settings for name and email: `git config --get-regexp user.*`.
   * Recommended Git settings:
      * `git config --global pull.rebase preserve` - when pulling remote changes, rebase your local changes on top of the remote changes, to avoid unnecessary merge commits.
      * `git config --global fetch.prune true` - when fetching remote changes, remove any remote branches that no longer exist on the remote.

### Node.js

iTowns uses NPM as the build tool. If you haven't already, install Node.js: https://nodejs.org/

## Get the code

* Have commit access to iTowns 2 ?
   * No
      * Fork [iTowns](https://github.com/iTowns/itowns2).
      * Use the [GitHub website](https://github.com/iTowns/itowns2/branches/all) to delete all branches in your fork except `master`.
      * Clone your fork, e.g., `git clone git@github.com:yourusername/itowns2.git`.
      * Make changes in a branch, e.g., `git checkout -b my-feature`.
   * Yes
      * Clone the iTowns repo, e.g., `git clone git@github.com:iTowns/itowns2.git`
      * Make changes in a branch, e.g., `git checkout -b my-feature`.

## Build the code

* Download dependencies: `npm install`
* Run the dev server:
   * `npm start` (you can change the port: `npm start -- --port 3000` if you obtain an error message that is not related to the port being in use, please check that your npm version is >2.0 `npm --vesrion`)
   * Open `http://localhost:8080/`
   * Make changes in the code, the browser will automatically reload on save
* Build iTowns to produce a single independent script:
   * `npm run build`
   * The script and its source-maps are generated into the `dist/` folder
   * You can run the built script to verify it works OK:
      * `python -m SimpleHTTPServer 8080` (change the port at your convenience)
      * Open `http://localhost:8080/`

## Contribute back

See [the contributor's guide](CONTRIBUTING.md)
