// Function allowing picking on a given 3D tiles layer and filling an html div
// with information on the picked feature
// Expected arguments:
// pickingArg.htmlDiv (div element which contains the picked information)
// pickingArg.view : iTowns view where the picking must be done
// pickingArg.layer : the layer on which the picking must be done
// eslint-disable-next-line
function fillHTMLWithPickingInfo(event, pickingArg) {
    const { htmlDiv, view, layer } = pickingArg;

    // Remove content already in html div
    while (htmlDiv.firstChild) {
        htmlDiv.removeChild(htmlDiv.firstChild);
    }

    // Get intersected objects
    const intersects = view.pickObjectsAt(event, 5, layer);

    // Get information from intersected objects (from the batch table and
    // eventually the 3D Tiles extensions
    const closestC3DTileFeature =
        layer.getC3DTileFeatureFromIntersectsArray(intersects);

    if (closestC3DTileFeature) {
        // eslint-disable-next-line
        htmlDiv.appendChild(createHTMLListFromObject(closestC3DTileFeature));
    }
}
