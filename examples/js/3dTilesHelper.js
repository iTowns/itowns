/* eslint-disable */
// Finds the batch table of an object in a 3D Tiles layer. This is
// for instance needed when picking because we pick the geometric
// object which is not at the same level in the layer structure as
// the  batch table. More details here on itowns internal
// organization of 3DTiles:
// https://github.com/MEPP-team/RICT/blob/master/Doc/iTowns/Doc.md#itowns-internal-organisation-of-3d-tiles-data
function findBatchTable(object) {
    if (object.batchTable) {
        return object.batchTable;
    }
    if (object.parent) {
        return findBatchTable(object.parent);
    }
    return undefined;
}

// Finds the intersected object with a batch id and returns an object
// storing this batch id and the batch table of this object
function getPickedBatchInfo(intersects) {
    for (var i = 0; i < intersects.length; i++) {
        // interAttributes are glTF attributes of b3dm tiles (i.e.
        // position, normal, batch id)
        var interAttributes = intersects[i].object.geometry.attributes;
        if (interAttributes && interAttributes._BATCHID) {
            // face is a Face3 object of THREE which is a
            // triangular face. face.a is its first vertex
            var vertex = intersects[i].face.a;
            // get batch id of the face
            var batchID = interAttributes._BATCHID.array[vertex];
            var batchTable = findBatchTable(
                intersects[i].object);

            return {
                batchID: batchID,
                batchTable: batchTable
            };
        }
    }
}

// Function allowing picking on a given 3D tiles layer and filling an html div
// with information on the picked feature
// This function expects arguments passed through the binding of this (see
// 3dtiles.html and 3dtiles_hierarchy.html for more information on how to
// bind this).
// Expected arguments:
// this.htmlDiv (div element which contains the picked information)
// this.view : iTowns view where the picking must be done
// this.layer : the layer on which the picking must be done
function fillHTMLWithPickingInfo(event) {
    // Remove content already in html div
    while (this.htmlDiv.firstChild) {
        this.htmlDiv.removeChild(this.htmlDiv.firstChild);
    }

    var intersects = view.pickObjectsAt(event, 5, this.layer);
    var batchInfo = getPickedBatchInfo(intersects);
    if (!batchInfo) return;
    var batchID = batchInfo.batchID;
    var batchTable = batchInfo.batchTable;

    // Print Batch id and batch table attributes in an
    // ui element
    var item = document.createElement('li');
    item.appendChild(
        document.createTextNode('Batch id: '));
    item.appendChild(document.createTextNode(batchID));
    var list = document.createElement('ul');
    // Change the padding (top: 0, right:0, bottom:0 and
    // left:1.5)
    list.style.padding = '0 0 0 1.5rem';
    list.appendChild(item);
    this.htmlDiv.appendChild(list);

    var featureDisplayableInfo = batchTable.getPickingInfo(batchID);
    this.htmlDiv.appendChild(createHTMLListFromObject(featureDisplayableInfo));
}
