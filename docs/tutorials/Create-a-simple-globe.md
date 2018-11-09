The goal of this tutorial is to give a brief example on how to use iTowns to
visualize a simple earth, with an elevation layer and a color layer.

## Preparing the webpage

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Simple globe with iTowns</title>
        <style>
            html: { height: 100%; }
            body: { margin: 0; overflow: hidden; height: 100%; }
            #viewerDiv: { margin: auto; height: 100%; width: 100%; padding: 0; }
            canvas: { display: block }
        </style>
     </head>
     <body>
        <div id="viewerDiv"></div>
        <script src="js/itowns.js"></script>
        <script type="text/javascript">
            // Our code goes here
        </script>
     </body>
</html>
```

## Creating a view

In order to be able to display anything with iTowns, we need one thing: a view,
so we have a support to put our data on. The view needs to be attached to an
element of the page in order to be displayed.

```js
var viewerDiv = document.getElementById('viewerDiv');
var position = new itowns.Coordinates('WGS84', 2.35, 48.8, 25e6);
var view = new itowns.GlobeView(viewerDiv, position);
```

Three things are done here. First we get the element of the page, on which the
view will be displayed. But getting this is not sufficient in our case to
display a globe view. [The documentation]{@link GlobeView} specifies that a
second parameter needs to be present: an object that will help place the camera
on the globe.

This object needs to contain three properties: `longitude`, `latitude` and
`altitude`, as in any World Geodetic System 84 (WGS84) coordinates. So we can
either pass an object created by hand, like `{ longitude: 2.35, latitude: 48.8,
altitude: 25e6 }` or create a {@link Coordinates} in the WGS84 system. A {@link}
Coordinates} in this reference system has the three asked properties set, so it
also answers our needs here.

Then, having those two objects, the {@link GlobeView} can be created. It should
result in a simple blue globe like below.

![Simple GlobeView](tutorials/images/Create-a-simple-globe-1.png)

## Adding a color layer

Now that we have a globe, let's display data on it. For this, let's use a basic
layer composed of aerial photos.

```js
var colorLayer = new itowns.ColorLayer('Ortho', {
    source: {
        protocol: 'wmts',
        url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
        name: 'ORTHOIMAGERY.ORTHOPHOTOS',
        tileMatrixSet: 'PM',
        format: 'image/jpeg',
    }
});
view.addLayer(colorLayer);
```

We want to create and add a layer containing images. The best candidate here is
the {@link ColorLayer}. Looking at the documentation, we need at least one
parameter: the `id` of the layer. But that won't be enough to display data if we
don't tell the layer where to look to get the data. For achieving this, we can
declare a source in the options.

Images that we choose to display are coming from a WMTS server. So the source
used will be a {@link WMTSSource}. To declare this source, four elements are
needed:
- a `protocol`, selecting the type of source we need, in our case `wmts`
- an `url`, describing the path to the WMTS service
- a `name`, used to build the URL for each image
- a `tileMatrixSet`, for the same purpose

A `format` will also be specified in our case, as we are looking for jpeg
images.

Then, having all the necessary things, the layer can simply be added to the view
using [`addLayer`](View#addLayer). The result is as below.

![Simple GlobeView with ColorLayer](tutorials/images/Create-a-simple-globe-2.png)


## Adding an elevation layer

We can add more depth to the current globe by providing an elevation layer. The
process is quite similar to adding a `ColorLayer`.

```js
var elevationLayer = new itowns.ElevationLayer('MNT_WORLD', {
    source: {
        protocol: 'wmts',
        url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
        name: 'ELEVATION.ELEVATIONGRIDCOVERAGE',
        tileMatrixSet: 'WGS84G',
        format: 'image/x-bil;bits=32'
    }
});
view.addLayer(elevationLayer);
```

Two things have changed:
- the layer created, which is an {@link ElevationLayer} instead
- the configuration, adapted to fit the source

Now we can zoom in and see some moutains !

![Simple Globe with moutains](tutorials/images/Create-a-simple-globe-3.png)

## Result

Congratulations ! By reaching here, we are now able to display a simple globe
with an elevation layer and an color layer. Here is the final code:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Simple globe with iTowns</title>
        <style>
            html { height: 100%; }
            body { margin: 0; overflow: hidden; height: 100%; }
            #viewerDiv { margin: auto; height: 100%; width: 100%; padding: 0; }
            canvas { display: block }
        </style>
     </head>
     <body>
        <div id="viewerDiv"></div>
        <script src="js/itowns.js"></script>
        <script type="text/javascript">
            var viewerDiv = document.getElementById('viewerDiv');
            var position = new itowns.Coordinates('WGS84', 2.35, 48.8, 25e6);
            var view = new itowns.GlobeView(viewerDiv, position);

            var colorLayer = new itowns.ColorLayer('Ortho', {
                source: {
                    protocol: 'wmts',
                    url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
                    name: 'ORTHOIMAGERY.ORTHOPHOTOS',
                    tileMatrixSet: 'PM',
                    format: 'image/jpeg'
                }
            });
            view.addLayer(colorLayer);

            var elevationLayer = new itowns.ElevationLayer('MNT_WORLD', {
                source: {
                    protocol: 'wmts',
                    url: 'http://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
                    name: 'ELEVATION.ELEVATIONGRIDCOVERAGE',
                    tileMatrixSet: 'WGS84G',
                    format: 'image/x-bil;bits=32'
                }
            });
            view.addLayer(elevationLayer);
        </script>
     </body>
</html>
```
