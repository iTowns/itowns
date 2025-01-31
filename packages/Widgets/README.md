## @itowns/widget (private, for the moment)

Graphic user interface for itowns

## Getting started

For the moment, The widget features are exposed in `itowns` module.

```bash
npm install --save itowns
```

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