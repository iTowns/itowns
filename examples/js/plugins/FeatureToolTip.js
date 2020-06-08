/* global itowns */
/**
 * A tooltip that can display some useful information about a feature when
 * hovering it.
 *
 * @module FeatureToolTip
 *
 * @example
 * // Initialize the FeatureToolTip
 * FeatureToolTip.init(viewerDiv, view);
 *
 * // Add layers
 * var wfsSource = new itowns.WFSSource(...);
 * var wfsLayer = new itowns.ColorLayer(wfsSource...);
 * view.addLayer(wfsLayer);
 *
 * var fileSource = new itowns.FileSource(...);
 * var fileLayer = new itowns.GeometryLayer(fileSource...);
 * view.addLayer(fileLayer);
 *
 * FeatureToolTip.addLayer(wfsLayer);
 * FeatureToolTip.addLayer(fileLayer);
 */
var FeatureToolTip = (function _() {
    var tooltip;
    var view;
    var layers = [];
    var layersId = [];

    var mouseDown = 0;
    document.body.addEventListener('mousedown', function _() {
        ++mouseDown;
    }, false);
    document.body.addEventListener('mouseup', function _() {
        --mouseDown;
    }, false);

    function moveToolTip(event) {
        tooltip.innerHTML = '';
        tooltip.style.display = 'none';

        var features = view.pickFeaturesAt.apply(view, [event, 3].concat(layersId));

        var layer;
        for (var layerId in features) {
            if (features[layerId].length == 0) {
                continue;
            }

            layer = layers[layersId.indexOf(layerId)];
            if (typeof layer.options.filterGeometries == 'function') {
                features[layerId] = layer.options.filterGeometries(features[layerId], layer.layer) || [];
            }
            tooltip.innerHTML += fillToolTip(features[layerId], layer.layer, layer.options);
        }

        if (tooltip.innerHTML != '') {
            tooltip.style.display = 'block';
            tooltip.style.left = view.eventToViewCoords(event).x + 'px';
            tooltip.style.top = view.eventToViewCoords(event).y + 'px';
        }
    }

    function fillToolTip(features, layer, options) {
        var content = '';
        var feature;
        var geometry;
        var style;
        var fill;
        var stroke;
        var symb = '';
        var prop;

        for (var p = 0; p < features.length; p++) {
            feature = features[p];

            geometry = feature.geometry;
            style = (geometry.properties && geometry.properties.style) || feature.style || layer.style;
            fill = style.fill.color;
            stroke = '1.25px ' + style.stroke.color;

            if (feature.type === itowns.FEATURE_TYPES.POLYGON) {
                symb = '&#9724';
            } else if (feature.type === itowns.FEATURE_TYPES.LINE) {
                symb = '&#9473';
                fill = style.stroke.color;
                stroke = '0px';
            } else if (feature.type === itowns.FEATURE_TYPES.POINT) {
                symb = '&#9679';
            }

            content += '<div>';
            content += '<span style="color: ' + fill + '; -webkit-text-stroke: ' + stroke + '">';
            content += symb + ' ';
            content += '</span>';

            if (geometry.properties) {
                content += (geometry.properties.name || geometry.properties.nom || geometry.properties.description || layer.name || '');
            }

            if (feature.type === itowns.FEATURE_TYPES.POINT) {
                content += '<br/><span class="coord">long ' + feature.coordinates[0].toFixed(4) + '</span>';
                content += '<br/><span class="coord">lat ' + feature.coordinates[1].toFixed(4) + '</span>';
            }

            if (geometry.properties && !options.filterAllProperties) {
                if (options.format) {
                    for (prop in geometry.properties) {
                        if (!options.filterProperties.includes(prop)) {
                            content += options.format(prop, geometry.properties[prop]) || '';
                        }
                    }
                } else {
                    content += '<ul>';
                    for (prop in geometry.properties) {
                        if (!options.filterProperties.includes(prop)) {
                            content += '<li>' + prop + ': ' + geometry.properties[prop] + '</li>';
                        }
                    }

                    if (content.endsWith('<ul>')) {
                        content = content.replace('<ul>', '');
                    } else {
                        content += '</ul>';
                    }
                }
            }

            content += '</div>';
        }

        return content;
    }

    return {
        /**
         * Initialize the `FeatureToolTip` plugin for a specific view.
         *
         * @param {Element} viewerDiv - The element containing the viewer.
         * @param {View} viewer - The view to bind the tooltip to.
         *
         * @example
         * const viewerDiv = document.getElementById('viewerDiv');
         * const view = new GlobeView(viewerDiv, { longitude: 4, latitude: 45, altitude: 3000 });
         *
         * FeatureToolTip.init(viewerDiv, view);
         *
         * @memberof module:FeatureToolTip
         */
        init: function _(viewerDiv, viewer) {
            // HTML element
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            viewerDiv.appendChild(tooltip);

            // View binding
            view = viewer;

            // Mouse movement listening
            function onMouseMove(event) {
                if (!mouseDown) {
                    moveToolTip(event);
                } else {
                    tooltip.style.left = view.eventToViewCoords(event).x + 'px';
                    tooltip.style.top = view.eventToViewCoords(event).y + 'px';
                }
            }

            document.addEventListener('mousemove', onMouseMove, false);
            document.addEventListener('mousedown', onMouseMove, false);
        },

        /**
         * Add a layer to be picked by the tooltip.
         *
         * @param {Layer} layer - The layer to add.
         * @param {Object} options - Options to have more custom content displayed.
         * @param {function} [options.filterGeometries] - A callback to filter
         * geometries following a criteria, like an id found on FeatureGeometry
         * properties.  This is useful to remove duplicates, for example when a
         * feature is present on multiple tiles at the same time (see the
         * example below).  This function takes two parameters: a list of
         * features (usually a `Array<Feature>`) and the `Layer` associated to
         * these features.
         * @param {function} [options.format] - A function that takes the name
         * of the property currently being processed and its value, and gives
         * the appropriate HTML output to it. If this method is specified, no
         * others properties other than the ones handled in it will be
         * displayed.
         * @param {Array<string>} [options.filterProperties] - An array of
         * properties to filter.
         * @param {boolean} [options.filterAllProperties=true] - Filter all the
         * properties, and don't display anything besides the name of the layer
         * the feature is attached to.
         *
         * @return {Layer} The added layer.
         *
         * @example
         * FeatureToolTip.addLayer(wfsLayer, {
         *      filterProperties: ['uuid', 'notes', 'classification'],
         *      filterGeometries: (features, layer) => {
         *          const idList = [];
         *          return features.filter((f) => {
         *              if (!idList.includes(f.geometry.properties.id)) {
         *                  idList.push(f.geometry.properties.id);
         *                  return f;
         *              }
         *          });
         *      }
         * });
         *
         * @memberof module:FeatureToolTip
         */
        addLayer: function _(layer, options) {
            if (!layer.isLayer) {
                return layer;
            }

            var opts = options || { filterAllProperties: true };
            opts.filterProperties = opts.filterProperties == undefined ? [] : opts.filterProperties;
            opts.filterProperties.concat(['name', 'nom', 'style', 'description']);

            layers.push({ layer: layer, options: opts });
            layersId.push(layer.id);

            return layer;
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = FeatureToolTip;
}
