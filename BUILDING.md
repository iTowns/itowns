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

The build system for iTowns 2 is under construction.

## Contribute back

See [the contributor's guide](CONTRIBUTING.md)
