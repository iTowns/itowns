// Function allowing picking on a given 3D tiles layer and filling an html div
// with information on the picked feature
// Expected arguments:
// pickingArg.htmlDiv (div element which contains the picked information)
// pickingArg.view : iTowns view where the picking must be done
// pickingArg.layer : the layer on which the picking must be done
// eslint-disable-next-line
function fillHTMLWithPickingInfo(event, pickingArg) {
    if (!pickingArg.layer.isC3DTilesLayer) {
        console.warn('Function fillHTMLWithPickingInfo only works' +
            ' for C3DTilesLayer layers.');
        return;
    }

    // Remove content already in html div
    while (pickingArg.htmlDiv.firstChild) {
        pickingArg.htmlDiv.removeChild(pickingArg.htmlDiv.firstChild);
    }

    // Get intersected objects
    const intersects = pickingArg.view.pickObjectsAt(event, 5, pickingArg.layer);
    if (intersects.length === 0) { return; }

    // Get information from intersected objects (from the batch table and
    // eventually the 3D Tiles extensions
    const closestC3DTileFeature = pickingArg.layer.getC3DTileFeatureFromIntersectsArray(intersects);

    if (closestC3DTileFeature) {
        // eslint-disable-next-line
        pickingArg.htmlDiv.appendChild(createHTMLListFromObject(closestC3DTileFeature.getInfo()));
    }
}
