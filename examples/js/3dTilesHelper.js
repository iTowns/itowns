// Function allowing picking on a given 3D tiles layer and filling an html div
// with information on the picked feature
// This function expects arguments passed through the binding of this (see
// 3dtiles.html and 3dtiles_hierarchy.html for more information on how to
// bind this).
// Expected arguments:
// this.htmlDiv (div element which contains the picked information)
// this.view : iTowns view where the picking must be done
// this.layer : the layer on which the picking must be done
// eslint-disable-next-line
function fillHTMLWithPickingInfo(event, view, pickingArg) {
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
    var intersects = view.pickObjectsAt(event, 5, pickingArg.layer);
    if (intersects.length === 0) { return; }

    // Get information from intersected objects (from the batch table and
    // eventually the 3D Tiles extensions
    var featureDisplayableInfo = pickingArg.layer.getInfoFromIntersectObject(intersects);

    if (featureDisplayableInfo) {
        // eslint-disable-next-line
        pickingArg.htmlDiv.appendChild(createHTMLListFromObject(featureDisplayableInfo));
    }
}
