## iTowns Debug (private, for the moment)

iTowns debugging utilities.

## Getting started

For the moment, The debug features aren't exposed in `itowns` module but in bundle.
We provide a debug bundle you can directly include in your html files:

```html
<script src="node_modules/itowns/dist/itowns.js"></script>
<script src="node_modules/itowns/dist/debug.js"></script>
<script src="node_modules/itowns/examples/js/GUI/GuiTools.js"></script>
<script type="text/javascript">
            // Define camera initial position
            const placement = {
                coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
                range: 2500,
            }

            // `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
            const viewerDiv = document.getElementById('viewerDiv');

            // Create a GlobeView
            const view = new itowns.GlobeView(viewerDiv, placement);

            // instance debug menu
            const debugMenu = new GuiTools('menuDiv', view);

            debug.createTileDebugUI(debugMenu.gui, view);
</script>
```

