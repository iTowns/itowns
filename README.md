
<p align="center">
<img src="https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/itowns_logo_300x134.png" />
</p>

## What is it?

iTowns is a [Three.js](https://threejs.org/)-based framework written in Javascript/WebGL for visualizing 3D geospatial data.

It can connect to WMS/WMTS/TMS servers including elevation data and load many different data formats (3dTiles, gpx, KML and much much more).

iTowns has been redesigned from this [early version](https://github.com/iTowns/itowns-legacy).

![iTowns screenshot](https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/itownsReleaseXS.jpg)

## API documentation and examples
**[API Documentation](http://www.itowns-project.org/itowns/API_Doc/)**


**Examples**

- [Globe](http://www.itowns-project.org/itowns/examples/globe.html)
- [Plane](http://www.itowns-project.org/itowns/examples/planar.html)
- [Scene postprocessing](http://www.itowns-project.org/itowns/examples/postprocessing.html)
- [3dtiles](http://www.itowns-project.org/itowns/examples/3dtiles.html)



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

See our [release page](https://github.com/iTowns/itowns/releases).


## Supported data types

- Imagery from WMTS/WMS/TMS
- Elevation (DTM/DSM) from WMTS
- 3D Tiles 


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

iTowns is currently maintained by IGN ( http://www.ign.fr ), Oslandia ( http://www.oslandia.com ) and AtolCD ( https://www.atolcd.com )

<p align="center">
<a href="http://www.ign.fr"><img src="https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_ign.png" height="150" /></a>&nbsp;
<a href="http://www.oslandia.com"><img src="https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_oslandia.png" height="150" /></a>&nbsp;
<a href="https://www.atolcd.com"><img src="https://raw.githubusercontent.com/iTowns/itowns.github.io/master/images/logo_atolcd.jpg" height="150" /></a>&nbsp;
</p>


