# iTowns 
[![Coverage Status](https://coveralls.io/repos/github/iTowns/itowns/badge.svg?branch=master)](https://coveralls.io/github/iTowns/itowns?branch=master)
[![example branch parameter](https://github.com/iTowns/itowns/actions/workflows/integration.yml/badge.svg?query=branch%3Amaster)](https://github.com/iTowns/itowns/actions/workflows/integration.yml?query=branch%3Amaster)
[![DeepScan grade](https://deepscan.io/api/teams/2856/projects/10991/branches/159107/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=2856&pid=10991&bid=159107)
[![Discord](https://img.shields.io/discord/1024249405634781244)](https://discord.gg/YueemZcEvw)

[![iTowns examples](./img/examples-mosaic.png)](http://www.itowns-project.org/itowns/examples/)

iTowns is a [Three.js](https://threejs.org/)-based framework written in
Javascript/WebGL for visualizing 2D and 3D geospatial data.

It supports various protocols and formats such as WMS, WMTS, TMS, MVT, 3D Tiles, GEOJSON, GPX, etc. that can be
displayed as base maps, terrain elevation, vector features and 3D models and stylized with a dedicated API.
Take a look at the [documentation](https://www.itowns-project.org/itowns/docs/#home), the 
[interactive demo](https://www.itowns-project.org/itowns/examples/#demo) and the list of
[examples](https://www.itowns-project.org/itowns/examples/) to see what you can do with iTowns.

It officially targets the last two major versions of Firefox,  Chromium-based browsers (Chrome, Edge, ...) and Safari
at the date of each release. Older browsers supporting WebGL 2.0 may work, but we do not offer support.

## Running it locally

iTowns can be run locally using either npm or Docker. Both methods serve them on port `8080`.

### Using npm

Requires [Node.js](https://nodejs.org/) (LTS version recommended).

```bash
git clone https://github.com/itowns/itowns.git
cd itowns
npm ci
npm start
```

### Using Docker

Requires [Docker](https://www.docker.com/).

```bash
git clone https://github.com/itowns/itowns.git
cd itowns
docker build -t itowns .
docker run -p 8080:8080 itowns
```

Alternatively, you can build and run directly from a remote branch of itowns in a single command:

```bash
docker run -p 8080:8080 $(docker build -q https://github.com/itowns/itowns.git#<branch>)
```

> Replace `<branch>` with the desired branch name (e.g. `master`, `dev`).

## Using it in your project

You can use it with npm (the preferred way) or download a bundle from our github release page.

### With npm

In your project:

To use all iTowns features, install `itowns` package :

```bash
npm install --save itowns
```

```js
import { Coordinates } from 'itowns';

const coordinates = new Coordinates('EPSG:4326', 88., 50.3, 120.3);

// change projection system to pseudo mercator
coordinates.as('EPSG:3857');
```

To import Widget features

```js
import { Navigation } from 'itowns/widgets';

const viewerDiv = document.getElementById('viewerDiv');

// Create a GlobeView
const view = new itowns.GlobeView(viewerDiv);

// Add navigation widget
const navigation = new Navigation(view, {
    position: 'bottom-right',
    translate: { y: -40 },
});
```

iTowns is currently moving to a monorepo organization and to a segmentation in sub-modules, allowing to import only some
of itowns functionalities. Current itowns sub-modules are:
- [@itowns/geographic](packages/Geographic/README.md): `npm install --save @itowns/geographic`

This package contains the ES5-compatible sources of iTowns, up to date with the latest release.

If you're using a module bundler (like wepback), you can directly write
`require('itowns')` in your code.

#### With a bundle

Alternatively, we provide 2 bundles (ESM and UMD) you can directly include in your html files

##### UMD 

The UMD bundle exposes `itowns` in `window`:

```html
<script src="node_modules/itowns/dist/itowns.umd.js"></script>
<script type="text/javascript">
    const  coord = new itowns.Coordinates('EPSG:4326', 3.5, 44);
</script>
```

*/!\ Please note that this UMD bundle also packages the peer dependencies, including threejs and proj4, see the `pacjages.json`
files for a full list*.

##### ESM 

iTowns ESM bundle can be imported with `importmap` and used in a `module` script.

```html
<script type="importmap">
{
    "imports": {
        "itowns": "node_modules/itowns/dist/itowns.js",
        "three": "https://unpkg.com/three@0.182.0/build/three.module.js"
    }
}
</script>
<script type="module">
    import * as THREE from 'three';
    import * as itowns from 'itowns';
    const  coord = new itowns.Coordinates('EPSG:4326', 3.5, 44);
</script>
```

### Try modifications before they are released

If you want to try some features or bug fixes that are planned for the next release, we provide
a version after each PR is merged:

```bash
npm install --save itowns@next
```

To switch back to the latest stable release:

```bash
npm install --save itowns@latest
```

## Contributing

If you are interested in contributing to iTowns, please read the [CONTRIBUTING
guide](CONTRIBUTING.md) and the [CODING guide](CODING.md).

## Licence

iTowns is dual-licenced under Cecill-B V1.0 and MIT.
Incorporated libraries are published under their original licences.

See [LICENSE.md](LICENSE.md) for more information.

## RoadMap

You will find the project Road map on the [RoadMap wiki](https://github.com/iTowns/itowns/wiki/Roadmap)

## Maintainers and governance

iTowns is an original work from French IGN, [MATIS research
laboratory](http://recherche.ign.fr/labos/matis/). It has been funded through
various research programs involving the French National Research Agency, Cap
Digital, UPMC, Mines ParisTec, CNRS, LCPC and maintained by several organizations
along the years (IGN, Oslandia, AtolCD, CIRIL Group). It has also received contributions from people [listed
here](CONTRIBUTORS.md).

iTowns is currently maintained by [IGN](http://www.ign.fr) and
[CIRIL Group](https://www.cirilgroup.com/en/). 

Contributions in any forms and new contributors and maintainers are welcome. Get in touch with us if you are interested :)

The governance of the project is open and explicited [here](https://github.com/iTowns/itowns-governance).

[![IGN](./img/logo_ign.png)](https://www.ign.fr)
[![CIRIL Group](./img/CIRIL_Group_logo.png)](https://www.cirilgroup.com/en/)
