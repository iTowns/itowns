/* global itowns */
/**
 * A tooltip that can display some useful information about a feature when
 * hovering it. Only works for layers using FileSource.
 *
 * @param {View} viewer - The view to bind the tooltip to.
 * @param {Object} options - Options to have more custom content displayed.
 * @param {number} [options.precisionPx=5] - The precision of the picking.
 * @param {function} [options.format] - A function that takes the name of the
 * property currently being processed and its value, and gives the appropriate
 * HTML output to it. If this method is specified, no others properties other
 * than the ones handled in it will be displayed.
 * @param {Array<string>} [options.filter] - An array of properties to filter.
 * @param {boolean} [options.filterAll=true] - Filter all the properties.
 * Default to true.
 *
 * @example
 * view.addEventListener(itowns.VIEW_EVENTS.LAYERS_INITIALIZED, function() {
 *      new ToolTip(view);
 * });
 */
function ToolTip(viewer, options) {
    var opts = options || { filterAll: true };
    opts.filter = opts.filter == undefined ? [] : opts.filter;

    var tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    viewer.mainLoop.gfxEngine.renderer.domElement.parentElement.appendChild(tooltip);

    var mouseDown = 0;
    document.body.onmousedown = function onmousedown() {
        ++mouseDown;
    };
    document.body.onmouseup = function onmouseup() {
        --mouseDown;
    };

    var layer;
    var result;
    var feature;
    var symb;
    var style;
    var fill;
    var stroke;
    var content;
    var prop;
    var layers = viewer.getLayers(function _(l) { return l.source && l.source.isFileSource; });
    function buildToolTip(geoCoord, e) {
        var visible = false;
        var i = 0;
        var p = 0;
        var precision = viewer.controls.pixelsToDegrees(opts.precisionPx || 5);

        tooltip.innerHTML = '';
        tooltip.style.display = 'none';
        if (geoCoord) {
            visible = false;

            // Pick on each layer, and display them all in the tooltip
            for (i = 0; i < layers.length; i++) {
                layer = layers[i];

                if (!layer.source.parsedData) { continue; }

                result = itowns.FeaturesUtils.filterFeaturesUnderCoordinate(geoCoord, layer.source.parsedData, precision);

                for (p = 0; p < result.length; p++) {
                    content = '';
                    visible = true;

                    feature = result[p].geometry;
                    style = layer.style.isStyle ? layer.style : feature.properties.style;
                    fill = style.fill.color;
                    stroke = '1.25px ' + style.stroke.color;

                    if (result[p].type === itowns.FEATURE_TYPES.POLYGON) {
                        symb = '&#9724';
                    } else if (result[p].type === itowns.FEATURE_TYPES.LINE) {
                        symb = '&#9473';
                        fill = style.stroke.color;
                        stroke = '0px';
                    } else if (result[p].type === itowns.FEATURE_TYPES.POINT) {
                        symb = '&#9679';
                    }

                    content += '<div>';
                    content += '<span style="color: ' + fill + '; -webkit-text-stroke: ' + stroke + '">';
                    content += symb + ' ';
                    content += '</span>';
                    content += (feature.properties.name || feature.properties.nom || feature.properties.description || layer.name);

                    if (result[p].type === itowns.FEATURE_TYPES.POINT) {
                        content += '<br/><span class="coord">long ' + result[p].coordinates[0].toFixed(4) + '</span>';
                        content += '<br/><span class="coord">lat ' + result[p].coordinates[1].toFixed(4) + '</span>';
                    }

                    if (feature.properties && !opts.filterAll) {
                        if (opts.format) {
                            for (prop in feature.properties) {
                                if (!opts.filter.includes(prop) && prop != 'style' && prop != 'name' && prop != 'nom' && prop != 'description') {
                                    opts.format(prop, feature.properties[prop]);
                                }
                            }
                        } else {
                            content += '<ul>';
                            for (prop in feature.properties) {
                                if (!opts.filter.includes(prop) && prop != 'style' && prop != 'name' && prop != 'nom' && prop != 'description') {
                                    content += '<li>' + prop + ': ' + feature.properties[prop] + '</li>';
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

                    tooltip.innerHTML += content;
                }
            }

            if (visible) {
                tooltip.style.left = viewer.eventToViewCoords(e).x + 'px';
                tooltip.style.top = viewer.eventToViewCoords(e).y + 'px';
                tooltip.style.display = 'block';
            }
        }
    }

    function readPosition(e) {
        if (!mouseDown) {
            buildToolTip(viewer.controls.pickGeoPosition(viewer.eventToViewCoords(e)), e);
        } else {
            tooltip.style.left = viewer.eventToViewCoords(e).x + 'px';
            tooltip.style.top = viewer.eventToViewCoords(e).y + 'px';
        }
    }

    document.addEventListener('mousemove', readPosition, false);
    document.addEventListener('mousedown', readPosition, false);
}

if (typeof module != 'undefined' && module.exports) {
    module.exports = ToolTip;
}
