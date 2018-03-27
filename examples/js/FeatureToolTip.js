/* global itowns, document */
// eslint-disable-next-line no-unused-vars
function ToolTip(viewer, viewerDiv, tooltip, precisionPx) {
    var mouseDown = 0;
    var layers = viewer.getLayers(function _(l) { return l.protocol === 'rasterizer'; });

    document.body.onmousedown = function onmousedown() {
        ++mouseDown;
    };
    document.body.onmouseup = function onmouseup() {
        --mouseDown;
    };

    function buildToolTip(geoCoord, e) {
        var visible = false;
        var precision = viewer.controls.pixelsToDegrees(precisionPx || 5);
        var i = 0;
        var p = 0;
        var id = 0;
        var layer;
        var result;
        var polygon;
        var color;
        var stroke;
        var name;
        var symb;
        var label;
        var line;
        var point;
        // var
        tooltip.innerHTML = '';
        tooltip.style.display = 'none';
        if (geoCoord) {
            visible = false;
            // convert degree precision
            for (i = 0; i < layers.length; i++) {
                layer = layers[i];
                result = itowns.FeaturesUtils.filterFeaturesUnderCoordinate(
                    geoCoord, layer.feature, precision);
                result.sort(function compare(a, b) { return b.feature.geometry.type !== 'point'; });
                for (p = 0; p < result.length; p++) {
                    visible = true;
                    if (result[p].feature.geometry.type === 'polygon') {
                        polygon = result[p].feature;
                        color = polygon.properties.fill || layer.style.fill;
                        stroke = polygon.properties.stroke || layer.style.stroke;
                        name = 'polygon' + id;
                        symb = '<span id=' + name + ' >&#9724</span>';
                        tooltip.innerHTML += symb + ' ' + (polygon.properties.name || polygon.properties.nom || polygon.properties.description || layer.name) + '<br />';
                        document.getElementById(name).style['-webkit-text-stroke'] = '1.25px ' + stroke;
                        document.getElementById(name).style.color = color;
                        ++id;
                    } else if (result[p].feature.geometry.type === 'linestring') {
                        line = result[p].feature;
                        color = line.properties.stroke || layer.style.stroke;
                        symb = '<span style=color:' + color + ';>&#9473</span>';
                        tooltip.innerHTML += symb + ' ' + (line.name || layer.name) + '<br />';
                    } else if (result[p].feature.geometry.type === 'point') {
                        point = result[p].feature;
                        color = 'white';
                        name = 'point' + id;
                        symb = '<span id=' + name + ' style=color:' + color + ';>&#9679</span>';
                        label = point.properties.name || point.properties.description || layer.name;
                        tooltip.innerHTML += '<div>' + symb + ' ' + label + '<br></div>';
                        tooltip.innerHTML += '<span class=coord>long ' + result[p].coordinates.longitude(itowns.UNIT.DEGREE).toFixed(4) + '<br /></span>';
                        tooltip.innerHTML += '<span class=coord>lati &nbsp; ' + result[p].coordinates.latitude(itowns.UNIT.DEGREE).toFixed(4) + '<br /></span>';
                        document.getElementById(name).style['-webkit-text-stroke'] = '1px red';
                        ++id;
                    }
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

    function pickPosition(e) {
        buildToolTip(viewer.controls.pickGeoPosition(viewer.eventToViewCoords(e)), e);
    }

    document.addEventListener('mousemove', readPosition, false);
    document.addEventListener('mousedown', pickPosition, false);
}

