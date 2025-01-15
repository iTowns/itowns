import { MathUtils, Vector3 } from 'three';

const { Coordinates, Extent, CameraUtils } = itowns;

/**
 * Function allowing picking on a given 3D tiles layer and filling an html div
 * with information on the picked feature.
 * @param {MouseEvent} event
 * @param {Object} pickingArg
 * @param {HTMLDivElement} pickingArg.htmlDiv - div element which contains the
 * picked information
 * @param {GlobeView} picking.view - iTowns view where the picking must be done
 * @param {OGC3DTilesLayer} pickingArg.layer - the layer on which the picking
 * must be done
 */
export function fillHTMLWithPickingInfo(event, pickingArg) {
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

    layer.getMetadataFromIntersections(intersects).then((metadata) => {
        // eslint-disable-next-line
        metadata?.forEach(m => htmlDiv.appendChild(createHTMLListFromObject(m)));
    });
}

function zoomToSphere(view, tile, sphere) {
    const transform = tile.cached.transform;

    const center = new Vector3().fromArray(sphere).applyMatrix4(transform);
    const radius = sphere[3] * transform.getMaxScaleOnAxis();

    // Get the distance to sphere where the diameter cover the whole screen
    // This is similar to SSE computation where sse = screen height.
    const fov = view.camera3D.fov * MathUtils.DEG2RAD;
    const distance = radius * Math.tan(fov * 2);

    return {
        coord: new Coordinates('EPSG:4978').setFromVector3(center),
        range: distance + radius,
    };
}

function zoomToBox(view, tile, box) {
    const radius = Math.max(
        new Vector3().fromArray(box, 3).length(),
        new Vector3().fromArray(box, 6).length(),
        new Vector3().fromArray(box, 9).length(),
    );

    // Approximate zoomToBox with sphere
    const sphere = [box[0], box[1], box[2], radius];
    return zoomToSphere(view, tile, sphere);
}

function zoomToRegion(view, region) {
    const extent = new Extent('EPSG:4326',
        region[0] * MathUtils.RAD2DEG, // west
        region[2] * MathUtils.RAD2DEG, // east
        region[1] * MathUtils.RAD2DEG, // south
        region[3] * MathUtils.RAD2DEG, // north
    );

    return CameraUtils.getCameraTransformOptionsFromExtent(
        view,
        view.camera3D,
        extent,
    );
}

function zoomToTile(view, tile) {
    const { region, box, sphere } = tile.boundingVolume;

    let cameraTransform;
    if (region) {
        cameraTransform = zoomToRegion(view, region);
    } else if (box) {
        cameraTransform = zoomToBox(view, tile, box);
    } else {
        cameraTransform = zoomToSphere(view, tile, sphere);
    }

    view.controls.lookAtCoordinate({
        coord: cameraTransform.coord,
        range: 1.25 * cameraTransform.range, // zoom out a little bit
        tilt: 60,
    });
}

export function zoomToLayer(view, layer) {
    const root = layer.tilesRenderer.root;

    zoomToTile(view, root);
}
