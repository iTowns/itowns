# How to contribute

Thanks for taking interest in iTowns !

In addition to contributing to the iTowns code, we appreciate many types of
contributions as well:

* Showcasing your application built with iTowns : in an issue or on discord.
* Writing tutorials, creating examples, and improving the reference
  documentation.
* Submitting issues as [described below](#submitting-an-issue).

If you don't know what to do but still want to contribute, check:

* Issues labeled [beginner](https://github.com/iTowns/itowns/labels/beginner)
* Issues labeled [help_wanted](https://github.com/iTowns/itowns/label/help_wanted)


## Submitting an Issue

If you think you've found a bug in iTowns or if you have an improvement proposal,
first search the [iTowns issues](https://github.com/iTowns/itowns/issues). 

If an issue already exists, you can add a comment with any additional information.
Use reactions to express your interest. This helps prioritize issues.

If a related issue does not exist, submit a new one following the issue template (bug report or proposal request).

## Fixing a bug, developing a feature or coding something

You are more than welcome to develop to iTowns, may it be a fix, a new feature,
documentation, or even a typo in a comment. For more information on the setup to
for developing, follow the [Coding guide](CODING.md).

## Opening a Pull Request

We welcome pull requests with great interest. We try to promptly review them,
provide feedback, and merge. Following the tips in this guide will help your
pull request be merged quickly.

If you plan to make a major change, please open an `proposal request` issue first. 
Pull requests for small features and bug fixes can generally just be opened directly.

### Pull Request Guidelines

Code quality matters. Here are some advices to read before submitting a Pull
Request.

* Verify your code passes the linter and tests (`npm run test`). See the
  [Testing guide](CODING.md#Testing).
* Write meaningful commit messages, by following the [Angular
  convention](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md).
  Here is a comprehensive list of all commit types we support :
    * `feat`, `features` or `feature` for some feature addition ;
    * `fix` for a bug fix ;
    * `perf` for some performance improvements;
    * `revert` for an undo operation ;
    * `doc` or `docs` for some changes on the documentation ;
    * `refactor`, `refacto` or `refactoring` for some code refactoring ;
    * `test` or `tests` for changes test related ;
    * `chore`, `rename` or `workflow` for some work on package versions or
        dependency updates, some file renaming or some changes on workflow files ;
    * `example` or `examples` for changes on examples or addition of a new one.
* Keep the git history clean, rebase your work on the `master` branch of this
  repository. The version changelog is generated from the commit messages,
  so please do squash commits with the same scope.
* If this is your first contribution to iTowns, add your name to
  [CONTRIBUTORS.md](https://github.com/iTowns/itowns/blob/master/CONTRIBUTORS.md).
* If you added new identifiers to the iTowns API:
   * Include reference documentation with code examples.
   * If your change adds significant features, provide a new example.
* If you added third-party libraries, including new version of existing
  libraries, update [LICENSE.md](LICENSE.md).
* Split the PR if it contains features from different scopes

### Pull request reviews

iTowns has been split in several technical areas.  
Each part of the codebase has several maintainers to ensure issues and pull requests 
are handled quickly and continuously.

Maintainers are responsible for:
- guiding technical discussions;
- ensuring regular reviews and reasonable turnaround times;
- keeping code and architectural decisions consistent within their scope.

If you are unsure who to ask for a review, please mention @Desplandis or @jailln,
and they will direct your request to the right people.

The following list shows the maintainers for each area of the codebase:

* Point Cloud: @ftoromanoff, @Desplandis, @ketourneau
* 3D tiles: @AnthonyGlt, @jailln
* Oriented Images: @Desplandis, @AnthonyGlt
* Vector and stylization: @Neptilo, @ftoromanoff, @Nynjin
* Raster: @Neptilo,  @Desplandis
* Subdivision, data querying and culling: @airnez, @Neptilo
* Geographic module: @airnez, @ftoromanoff
* Camera, controls: @AnthonyGlt, @HoloTheDrunk
* Planar View: @ketourneau, @ftoromanoff, @airnez
* Picking: @Neptilo,  @HoloTheDrunk
* Labels: @HoloTheDrunk, @Nynjin, @jailln
* VR: @Neptilo, @AnthonyGlt
* Rendering specific: @Neptilo, @HoloTheDrunk, @Desplandis
* Architecture: @Desplandis, @jailln
* Tooling:
  * Code quality (typescript, transpiling, linting) : @Neptilo, @Desplandis
  * Tests, CI : @airnez, @ftoromanoff
  * Scripting : @Desplandis, @jailln

## IP

iTowns is Licenced under a dual licence CeCILL-B v1.0 and MIT (See
[LICENSE.md](LICENSE.md)). If you want to include your code in the iTowns
project, you have to licence the code under these same licences. You stay author
of your work.

You should also do an IP review for your contribution, to ensure that you have
all rights to the code and that no patent apply to it.

## Resources

This CONTRIBUTING documentation has been inspired by the Cesium Contributing doc:
* https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CONTRIBUTING.md
