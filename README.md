
<p align="center">
<img src="http://www.itowns.fr/images/logo-itowns2XS.png" />
</p>

# iTowns V2

## What is it?

iTowns is a [Three.js](https://threejs.org/)-based framework written in Javascript/WebGL for visualizing 3D geospatial data.

It can connect to WMS/WMTS/TMS servers including elevation data and load many different data format (3dTiles, gpx, KML and much much more).

The V2 of iTowns Open Source is a refactoring of [iTowns V1](https://github.com/iTowns/itowns-legacy).

**[Documentation](http://www.itowns-project.org/itowns2/API_Doc/)**

**Examples**

- [Globe](http://www.itowns-project.org/itowns2/examples/globe.html)
- [Plane](http://www.itowns-project.org/itowns2/examples/planar.html)
- [Scene postprocessing](http://www.itowns-project.org/itowns2/examples/postprocessing.html)
- [3dtiles](http://www.itowns-project.org/itowns2/examples/3dtiles.html)

![iTowns screenshot](http://www.itowns.fr/videos/itowns2.jpg)

## How to use Itowns in your project

You can use it through npm (the preferred way) or download a bundle from our github release page.

### With NPM

In your project:

```bash
npm install --save itowns
```
This package contains the ES5-compatible sources of Itowns.

If you're using a module bundler (like wepback), you can directly `require('itowns')` in your code.

Alternatively, we provide a bundle you can directly include in your html files that exposes `itowns` in  `window`:
```html
<script src="node_modules/itowns/dist/itowns.js"></script>
```

**/!\ Please note that this bundle also contains the dependencies**.

### From a release bundle

See our [release page](https://github.com/iTowns/itowns/releases) (coming soon).


## Supported data types

- Aerial photography 
- DTM
- Buildings

## API documentation and demo 

You can find an API documentation here [http://www.itowns-project.org/itowns2/API_Doc/]

If you want to play with a demonstration, please see [http://www.itowns-project.org/itowns2/]

## Licence

iTowns V2 is dual-licenced under Cecill-B V1.0 and MIT.
Incorporated libraries are published under their original licences.

See [LICENSE.md](LICENSE.md) for more information.

## Contributors

iTowns has received contributions from people listed in [CONTRIBUTORS.md](CONTRIBUTORS.md).
If you are interested in contributing to iTowns, please read [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

iTowns is an original work from French IGN, MATIS research laboratory.
It has been funded through various research programs involving the French National Research Agency, Cap Digital, UPMC, Mines ParisTec, CNRS, LCPC.

iTowns is currently maintained by IGN ( http://www.ign.fr ) and Oslandia ( http://www.oslandia.com )

![IGN Logo](https://raw.githubusercontent.com/iTowns/itowns/master/images/IGN_logo_2012.png)
![Oslandia Logo](https://raw.githubusercontent.com/iTowns/itowns/master/images/Oslandia_logo.png)
