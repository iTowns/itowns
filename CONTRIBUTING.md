Thanks for helping the iTowns project!

There are various ways of contributing to the project:

* [getting started contributing](#getting-started-contributing)
* [submitting an issue](#submitting-an-issue),
* [opening a pull request](#opening-a-pull-request)

## Getting Started Contributing

Everyone is welcome to contribute to iTowns!

In addition to contributing to core iTowns code, we appreciate many types of contributions:

* Being active on the iTowns mailing lists (see above) by answering questions and providing input on iTowns' direction.
* Showcasing your application built with iTowns : submit an issue with a link to your demo on the [iTowns website repository](https://github.com/iTowns/itowns.github.io/issues). Tag it with the *demo* label
* Writing tutorials, creating examples, and improving the reference documentation. See the issues labeled [doc](https://github.com/iTowns/itowns/labels/doc)
* Submitting issues as [described above](#submitting-an-issue)
* Triaging issues. Browse the [issues](https://github.com/iTowns/itowns/issues) and comment on issues that are no longer reproducible or on issues for which you have additional information
* Creating ecosystem projects for [glTF](https://github.com/KhronosGroup/glTF/issues/456), [3D Tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles)

For ideas for iTowns code contributions, see:

* Issues labeled [beginner](https://github.com/iTowns/itowns/labels/beginner)
* Issues labeled [help_wanted](https://github.com/iTowns/itowns/label/help_wanted)

See the [build guide](BUILDING.md) for how to build and run iTowns on your system.

## Submitting an Issue

If you have a question, do not submit an issue; instead, use the iTowns mailing lists. There is a user mailing list and a developer mailing list.

You can subscribe to the mailing lists here:

* Developer: https://lists.osgeo.org/mailman/listinfo/itowns-dev
* User: https://lists.osgeo.org/mailman/listinfo/itowns-user

The mailing list archives are here:

* Developer: https://lists.osgeo.org/pipermail/itowns-dev/
* User: https://lists.osgeo.org/pipermail/itowns-user/

If you cannot find any information on your problem in the archive, you can start a new thread by sending an email to the list, and someone will probably answer with a solution. Please indicate clearly in your email title that you work with iTowns version 2:  *[iTownsV2]*

If you think you've found a bug in iTowns, first search the [iTowns issues](https://github.com/iTowns/itowns/issues). If an issue already exists, you can add a comment with any additional information. Use reactions (not comments) to express your interest. This helps prioritize issues.

If a related issue does not exist, submit a new one. Please include as much of the following information as is relevant:
* Sample data to reproduce the issue
* Screenshot, video or animated .gif if appropriate (try [LICEcap](http://www.cockos.com/licecap/)). Screenshots are particularly useful for exceptions and rendering artifacts. If it is a rendering artifact, also include the output of [webglreport.com](http://webglreport.com/) for the computer you have the problem on
* Link to the thread if this was discussed on the iTowns mailing list or elsewhere
* Your operating system and version, browser and version, and video card.  Are they all up-to-date? Is the issue specific to one of them?
* The exact version of iTowns. Did this work in a previous version?
* Ideas for how to fix or workaround the issue. Also mention if you are willing to help fix it. If so, the iTowns team can often provide guidance and the issue may get fixed more quickly with your help


## Opening a Pull Request

We welcome pull requests with great interest. We try to promptly review them, provide feedback, and merge. Following the tips in this guide will help your pull request be merged quickly.

If you plan to make a major change, please start a new thread on the [iTowns mailing list](https://lists.osgeo.org/mailman/listinfo/itowns-dev) first. Pull requests for small features and bug fixes can generally just be opened without discussion on the list.

In the future, major code change will need to be submitted to the PSC trough an *iTowns Enhancement Proposal*. See the [PSC](https://github.com/iTowns/itowns-project/blob/master/PSC.md) document for the (simple) process.

### Pull Request Guidelines

Code quality matters. Here are some advices to read before submitting a Pull Request.

* If this is your first contribution to iTowns, add your name to [CONTRIBUTORS.md](https://github.com/iTowns/itowns/blob/master/CONTRIBUTORS.md)
* If your pull request fixes an existing issue, include a link to the issue in the description. Likewise, if your pull request fixes an issue reported on the iTowns mailing list, include a link to the thread in the list archive
* If your pull request needs additional work, include a [task list](https://github.com/blog/1375%0A-task-lists-in-gfm-issues-pulls-comments), or better, split it in several PR
* Ping @itowns-reviewers to get your code reviewed, and also when you are done making new commits to address feedback, since GitHub doesn't notify us about commits
* Verify your code passes the linter and tests (`npm run test`). See the [Build Guide](BUILDING.md)
* If you added new identifiers to the iTowns API:
   * Include reference documentation with code examples
   * If your change adds significant features, provide a demo
* If you added third-party libraries, including new version of existing libraries, update [LICENSE.md](LICENSE.md).  Mention it in [CHANGES.md](CHANGES.md). If you plan to add a third-party library, start a new thread on the [iTowns dev mailing list](https://lists.osgeo.org/mailman/listinfo/itowns-dev) first
* Write meaningful commit messages
* Keep the git history clean, rebase your work when necessary
* Delete unused and obsolete branches

## IP

iTowns is Licenced under a dual licence CeCILL-B v1.0 and MIT (See [LICENSE.md](LICENSE.md)). If you want to include your code in the iTowns project, you have to licence the code under these same licences. You stay author of your work.

You should also do an IP review for your contribution, to ensure that you have all rights to the code and that no patent apply to it.


## Resources

This CONTRIBUTING documentation has been inspired by the Cesium Contributing doc:
* https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CONTRIBUTING.md
