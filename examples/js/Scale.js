/**
 * For a given pixel size, calculates the projected metric distance at the middle of the screen.
 * Calculates then the pixel distance equivalent to the rounded computed metric distance.
 *
 * @param {itowns.View} view View in which the distances are computed.
 * @param {number} pixelSize Distance in pixels, at the center of the view.
 * @return {{pixels: number, meters: number}} The rounded pixel and metric distances.
 */
// eslint-disable-next-line no-unused-vars
function roundPixelsFromMeters(view, pixelSize) {
    // Calculate the metric distance which match the given pixel distance :
    var distanceMeters = view.getPixelsToMeters(pixelSize);

    // Round the metric distance :
    distanceMeters = Math.floor(distanceMeters);
    var digit = Math.pow(10, distanceMeters.toString().length - 1);
    distanceMeters = Math.round(distanceMeters / digit) * digit;

    // Round the pixel distance to match the rounded metric distance :
    var roundedPixDistance = view.getMetersToPixels(distanceMeters);

    return {
        pixels: roundedPixDistance,
        meters: distanceMeters,
    };
}

// eslint-disable-next-line no-unused-vars
function getMetersUnit(distanceMeters) {
    var distance = distanceMeters;
    var unit = 'm';
    if (distanceMeters >= 1000) {
        distance /= 1000;
        unit = 'km';
    }
    return {
        distance: distance,
        unit: unit,
    };
}
