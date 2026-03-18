import { MathUtils, Vector3 } from 'three';

import { Coordinates, Extent, CameraUtils } from 'itowns';

// eslint-disable-next-line import/extensions
import { createHTMLListFromObject } from './GUI/GuiTools.js';

/**
 * Extract the CityJSON Building id from metadata returned by getMetadataFromIntersections.
 * Prefer BuildingId (Tyler), then id. Returns the first non-null value found in the metadata array.
 * @param {Array<Object>|null} metadata
 * @returns {string|null}
 */
export function extractBuildingId(metadata) {
    if (!Array.isArray(metadata)) { return null; }
    for (const m of metadata) {
        if (m && typeof m === 'object') {
            if (m.BuildingId != null && m.BuildingId !== '') { return String(m.BuildingId); }
            if (m.id != null && m.id !== '') { return String(m.id); }
        }
    }
    return null;
}

/**
 * Function allowing picking on a given 3D tiles layer and filling an html div
 * with information on the picked feature. Displays only the BuildingId (the id
 * that links to the CityJSON building) when present, so users can report e.g.
 * "Building 253 is missing a wall".
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
    const closestC3DTileFeature =
        layer.getC3DTileFeatureFromIntersectsArray(intersects);

    // Resolve metadata first; show only BuildingId when present (CityJSON building id)
    layer.getMetadataFromIntersections(intersects).then((metadata) => {
        const buildingId = extractBuildingId(metadata);
        if (buildingId != null) {
            htmlDiv.appendChild(createHTMLListFromObject({ BuildingId: buildingId }));
        } else {
            // No BuildingId in tile (e.g. old tiles); show batchId as fallback with a note
            const batchId = closestC3DTileFeature?.batchId ?? closestC3DTileFeature?.batchid ?? '—';
            htmlDiv.appendChild(createHTMLListFromObject({
                BuildingId: '(not in tile)',
                batchId,
                note: 'Tile has no BuildingId; batchId is the feature index in this tile.',
            }));
        }
    }).catch((err) => {
        console.warn('getMetadataFromIntersections failed (e.g. missing EXT_structural_metadata):', err?.message ?? err);
        const i0 = intersects?.[0];
        const batchId = closestC3DTileFeature?.batchId ?? closestC3DTileFeature?.batchid ?? '—';
        const fallback = {
            BuildingId: '(unavailable)',
            note: 'Metadata unavailable (no property table or error)',
            batchId,
        };
        if (i0?.distance != null) { fallback.distance = Number(i0.distance).toFixed(2); }
        if (i0?.point) {
            fallback.point = { x: i0.point.x?.toFixed(2), y: i0.point.y?.toFixed(2), z: i0.point.z?.toFixed(2) };
        }
        htmlDiv.appendChild(createHTMLListFromObject(fallback));
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
