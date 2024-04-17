## iTowns Geodesy

# Install

`npm install --save @itowns/geodesy`

# Getting started


```js
import { Coordinates, Extent } from @itowns/geodesy;

const coordinates = new Coordinates('EPSG:4326', 88.002445, 50.336522, 120.32201);
const extent = new Extent('EPSG:4326', 88.002445, 50.336522, 22.021, 50.302548);

// change projection system to pseudo mercator

coordinates.as('EPSG:3857');
extent.as('EPSG:3857');
```

Visiting [epsg.io](https://epsg.io/) to more coordinate system worldwide.

Visiting iTowns [documentation](http://www.itowns-project.org/itowns/docs/#home) for more information.
