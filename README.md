![iTowns](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/itowns_logo_300x134.png)
# iTowns

[![Coverage Status](https://coveralls.io/repos/github/iTowns/itowns/badge.svg?branch=master)](https://coveralls.io/github/iTowns/itowns?branch=master)
[![Build Status](https://travis-ci.com/iTowns/itowns.svg?branch=master)](https://travis-ci.com/iTowns/itowns)
[![DeepScan grade](https://deepscan.io/api/teams/2856/projects/10991/branches/159107/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=2856&pid=10991&bid=159107)

## What is it?

iTowns is a [Three.js](https://threejs.org/)-based framework written in
Javascript/WebGL for visualizing 3D geospatial data.

It can connect to WMS/WMTS/TMS servers including elevation data and load many
different data formats (3dTiles, GeoJSON, Vector Tiles, GPX and much more). A
complete list of features and supported data formats is [available on the
wiki](https://github.com/iTowns/itowns/wiki/Supported-Features).

![iTowns screenshot](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/itownsReleaseXS.jpg)

## Documentation and examples

The official documentation is [available
here](http://www.itowns-project.org/itowns/docs/). It contains tutorials to help
you start using iTowns, and an API reference. You can find more informations on
its contribution [here](docs/README.md).

Official examples can be [viewed
here](http://www.itowns-project.org/itowns/examples/). Some examples available:

* [Globe with WFS data](http://www.itowns-project.org/itowns/examples/#source_stream_wfs_3d)
* [Plane mode with Vector Tiles](http://www.itowns-project.org/itowns/examples/#vector_tile_raster_2d)
* [3D effect using scene postprocessing](http://www.itowns-project.org/itowns/examples/#effects-stereo)
* [Globe with split rendering](http://www.itowns-project.org/itowns/examples/#effects_split)

[![iTowns examples](http://www.itowns-project.org/images/montage.jpg)](http://www.itowns-project.org/itowns/examples/)

## How to use

You can use it through npm (the preferred way) or download a bundle from our
github release page.

### With npm

In your project:

```bash
npm install --save itowns
```

This package contains the ES5-compatible sources of iTowns.

If you're using a module bundler (like wepback), you can directly write
`require('itowns')` in your code.

Alternatively, we provide a bundle you can directly include in your html files
that exposes `itowns` in `window`:

```html
<script src="node_modules/itowns/dist/itowns.js"></script>
```

**/!\ Please note that this bundle also contains the dependencies**.

### From a release bundle

See our [release page](https://github.com/iTowns/itowns/releases). Note that
there isn't a lot of support for older version of iTowns, we highly recommand to
use the last release everytime.

## Contributing

If you are interested in contributing to iTowns, please read the [CONTRIBUTING
guide](CONTRIBUTING.md) and the [CODING guide](CODING.md).

iTowns has been redesigned from this [early version](https://github.com/iTowns/itowns-legacy).

## Licence

iTowns is dual-licenced under Cecill-B V1.0 and MIT.
Incorporated libraries are published under their original licences.

See [LICENSE.md](LICENSE.md) for more information.

## Support

iTowns is an original work from French IGN, [MATIS research
laboratory](http://recherche.ign.fr/labos/matis/).  It has been funded through
various research programs involving the French National Research Agency, Cap
Digital, UPMC, Mines ParisTec, CNRS, LCPC.

iTowns is currently maintained by [IGN](http://www.ign.fr) and
[AtolCD](https://www.atolcd.com), and has been maintained by [Oslandia]() in the
past. It has also received contributions from people [listed
here](CONTRIBUTORS.md).

[![IGN](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_ign.png)](https://www.ign.fr)
[![AtolCD](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_atolcd.jpg)](https://www.atolcd.com)
[![Oslandia](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_oslandia.png)](https://www.oslandia.com)
