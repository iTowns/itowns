/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
/* eslint-disable vars-on-top */
/* eslint-disable no-continue */
/* eslint-disable no-bitwise */
function mapboxStyle(properties) {
    var styles = [];
    properties.mapboxLayer.forEach(function _(layer) {
        var r = { };
        // a feature could be used in several layers...
        if ('paint' in layer) {
            if (layer.type === 'fill') {
                r.fill = layer.paint['fill-color'];
                r.fillOpacity = layer.paint['fill-opacity'];
            }
            if (layer.type === 'line') {
                r.stroke = layer.paint['line-color'];
                if ('line-width' in layer.paint) {
                    r.strokeWidth = layer.paint['line-width'].base;
                }
                r.strokeOpacity = layer.paint['line-opacity'];
            }
        }
        styles.push(r);
    });

    if (styles.length === 1) {
        return styles[0];
    }

    return styles;
}

function mapboxFilter(layers) {
    return function _(properties, geometry) {
        properties.mapboxLayer = [];
        layers.forEach(function _(layer) {
            if (properties.vt_layer !== layer['source-layer']) {
                return;
            }
            if ('filter' in layer) {
                var filteredOut = false;
                for (var i = 0; i < layer.filter.length; i++) {
                    var filter = layer.filter[i];

                    if (filter.length === undefined) {
                        continue;
                    }
                    if (filter[0] === '==') {
                        if (filter[1] === '$type') {
                            filteredOut |= (filter[2] !== geometry.type);
                        } else if (filter[1] in properties) {
                            filteredOut |= (properties[filter[1]] !== filter[2]);
                        }
                    } else if (filter[0] === 'in') {
                        filteredOut |= (filter.slice(2).indexOf(properties[filter[1]]) === -1);
                    }
                    if (filteredOut) {
                        break;
                    }
                }
                if (!filteredOut) {
                    properties.mapboxLayer.push(layer);
                }
            } else {
                properties.mapboxLayer.push(layer);
            }
        });
        return properties.mapboxLayer.length > 0;
    };
}
