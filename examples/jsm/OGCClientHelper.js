// @ts-check
import { WmtsEndpoint, WmsEndpoint, WfsEndpoint } from '@camptocamp/ogc-client';
import { Extent, WFSSource, WMSSource, WMTSSource } from 'itowns';

/** @typedef {WmtsEndpoint | WmsEndpoint | WfsEndpoint} Endpoint */
/** @typedef {import('@camptocamp/ogc-client').BoundingBox} BoundingBox */
/** @typedef {import('@camptocamp/ogc-client').WfsFeatureTypeSummary} WfsFeatureType */
/** @typedef {import('@camptocamp/ogc-client').WmsLayerFull} WmsLayer */
/** @typedef {import('@camptocamp/ogc-client').WmtsLayer} WmtsLayer */
/** @typedef {WmtsLayer['matrixSets'][number]['limits']} MatrixSetLimits */
/** @typedef {WmtsLayer | WmsLayer | WfsFeatureType} LayerDescriptor */
/**
 * @typedef {object} LayerSource
 * @property {WMTSSource | WMSSource | WFSSource} source
 * @property {'color' | 'elevation'} layerType
 */

const SUPPORTED_CRS = ['EPSG:3857', 'EPSG:4326'];
const RASTER_FORMATS = ['image/png', 'image/jpeg'];
const VECTOR_FORMATS = ['application/json', 'application/geojson'];

function isCrsSupported(/** @type {string} */ crs) {
    return SUPPORTED_CRS.includes(crs);
}

function findCompatibleMatrixSet(/** @type {WmtsLayer} */ layer) {
    return layer.matrixSets.find(matrixSet => isCrsSupported(matrixSet.crs));
}

function tileMatrixSetLimits(/** @type {MatrixSetLimits} */ limits) {
    return Object.fromEntries(
        limits.map(({ tileMatrix, ...bounds }) => [tileMatrix, bounds]),
    );
}

function bboxToExtent(/** @type {BoundingBox} */ bbox, /** @type {string} */ crs) {
    const [west, south, east, north] = bbox;
    return new Extent(crs).setFromExtent({ west, south, east, north });
}

function getWMTSLayerCrs(/** @type {WmtsLayer} */ layer) {
    return findCompatibleMatrixSet(layer)?.crs;
}

function getWMSLayerCrs(/** @type {WmsLayer} */ layer) {
    return layer.availableCrs.find(crs => isCrsSupported(crs));
}

function getWFSLayerCrs(/** @type {WfsFeatureType} */ featureType) {
    return isCrsSupported(featureType.defaultCrs) ? featureType.defaultCrs
        : featureType.otherCrs.find(crs => isCrsSupported(crs));
}


function selectRasterFormat(/** @type {string[] | undefined} */ formats) {
    if (!formats) { return; }
    return RASTER_FORMATS.find(f => formats.includes(f));
}

function selectVectorFormat(/** @type {string[] | undefined} */ formats) {
    if (!formats) { return; }
    return VECTOR_FORMATS.find(f => formats.includes(f));
}

/**
 * Returns a globe-compatible CRS from a layer descriptor.
 *
 * @param {LayerDescriptor} layer - A WMS, WFS or WMTS layer descriptor.
 * @returns {string | undefined} A compatible CRS, or `undefined` if none is
 * available.
 */
export function getLayerCrs(layer) {
    if ('matrixSets' in layer) { // WMTS layer
        return getWMTSLayerCrs(layer);
    }
    if ('availableCrs' in layer) { // WMS layer
        return getWMSLayerCrs(layer);
    }
    if ('defaultCrs' in layer) { // WFS layer
        return getWFSLayerCrs(layer);
    }
    return;
}

/**
 * Zoom levels covered by a WMTS layer, or `undefined` for any other layer.
 *
 * @param {LayerDescriptor} layer - A WMS, WFS or WMTS layer descriptor.
 * @returns {{ min: number, max: number } | undefined}
 */
export function getZoom(layer) {
    if (!('matrixSets' in layer)) {
        return;
    }

    const limits = findCompatibleMatrixSet(layer)?.limits;
    if (!limits?.length) {
        return;
    }

    // Note: This is fragile but we are severely limited by the lack of support
    // for tilegrids. See WMTSEndpoint#getOpenLayersTileGrid.
    const zooms = limits.map(limit => Number(limit.tileMatrix));
    return { min: Math.min(...zooms), max: Math.max(...zooms) };
}

/**
 * Fetch and parse the capabilities of an OGC service from an URL and the type
 * of service. Supported services include WMS, WFS and WMTS.
 *
 * @param {string} url
 * @param {'wmts' | 'wms' | 'wfs'} type
 * @returns {Promise<Endpoint>}
 */
export function endpointFromUrl(url, type) {
    switch (type) {
        case 'wmts':
            return new WmtsEndpoint(url).isReady();
        case 'wms':
            return new WmsEndpoint(url).isReady();
        case 'wfs':
            return new WfsEndpoint(url).isReady();
        default:
            throw new Error(`Unsupported OGC service type: ${type}`);
    }
}

/**
 * List renderable layers advertised by an OGC service.
 *
 * @param {Endpoint} endpoint - The OGC endpoint to list layers from.
 * @returns {LayerDescriptor[]} - A list of layer descriptors.
 */
export function listLayers(endpoint) {
    if (endpoint instanceof WmtsEndpoint) {
        return endpoint.getLayers();
    }

    if (endpoint instanceof WmsEndpoint) {
        return endpoint.getFlattenedLayers()
            // Layers without a name are group headers, they cannot be rendered
            .filter(layer => layer.name)
            .map(layer => endpoint.getLayerByName(layer.name));
    }

    if (endpoint instanceof WfsEndpoint) {
        return endpoint.getFeatureTypes()
            .map(f => endpoint.getFeatureTypeSummary(f.name));
    }

    throw new Error('Unsupported OGC endpoint');
}

/**
 * @param {WmtsEndpoint} endpoint
 * @param {string} name
 * @returns {LayerSource}
 */
function wmtsSource(endpoint, name) {
    const layer = endpoint.getLayerByName(name);
    if (!layer) {
        throw new Error(`WMTS layer "${name}" not found in capabilities`);
    }

    const url = endpoint.getServiceInfo()?.getTileUrls?.kvp ??
        layer.resourceLinks?.find(link => link.encoding === 'KVP')?.url;
    if (!url) {
        throw new Error(`No KVP GetTile URL found for WMTS layer "${name}"`);
    }

    const matrixSet = findCompatibleMatrixSet(layer);
    if (!matrixSet) {
        throw new Error(`No globe matrixSet for WMTS layer "${name}"`);
    }

    const format = selectRasterFormat(layer.resourceLinks?.map(link => link.format));
    if (!format) {
        throw new Error(`Image format not supported for WMTS layer "${name}"! ${layer.resourceLinks?.map(link => link.format).join(', ')}`);
    }

    return {
        source: new WMTSSource({
            url,
            name: layer.name,
            crs: matrixSet.crs,
            tileMatrixSet: matrixSet.identifier,
            format,
            tileMatrixSetLimits: matrixSet.limits?.length
                ? tileMatrixSetLimits(matrixSet.limits)
                : undefined,
        }),
        layerType: 'color',
    };
}

/**
 * @param {WmsEndpoint} endpoint
 * @param {string} name
 * @returns {LayerSource}
 */
function wmsSource(endpoint, name) {
    const layer = endpoint.getLayerByName(name);
    if (!layer) {
        throw new Error(`WMS layer "${name}" not found in capabilities`);
    }

    const url = endpoint.getOperationUrl('GetMap') ??
        endpoint.getCapabilitiesUrl();

    const crs = getWMSLayerCrs(layer);
    if (!crs) {
        throw new Error(`No globe-compatible CRS for WMS layer "${name}"`);
    }

    const format = selectRasterFormat(endpoint.getServiceInfo()?.outputFormats);
    if (!format) {
        throw new Error(`No image output format for WMS layer "${name}"`);
    }

    const bbox = layer.boundingBoxes?.[crs];
    if (!bbox) {
        throw new Error(`No bounding box for WMS layer "${name}"`);
    }

    return {
        source: new WMSSource({
            url,
            name: layer.name,
            crs,
            format,
            extent: bboxToExtent(bbox, crs),
            version: endpoint.getVersion(),
            // Note: keep those parameters until we have saner defaults
            transparent: true,
        }),
        layerType: 'color',
    };
}

/**
 * @param {WfsEndpoint} endpoint
 * @param {string} name
 * @returns {LayerSource}
 */
function wfsSource(endpoint, name) {
    const featureType = endpoint.getFeatureTypeSummary(name);
    if (!featureType) {
        throw new Error(`WFS feature type "${name}" not found in capabilities`);
    }

    const url = endpoint.getOperationUrl('GetFeature') ??
        endpoint.getCapabilitiesUrl();

    const crs = getWFSLayerCrs(featureType);
    if (!crs) {
        throw new Error(`No globe CRS for WFS feature type "${name}"`);
    }

    const format = selectVectorFormat(featureType.outputFormats);
    if (!format) {
        throw new Error(`Feature type "${name}" does not advertise JSON output format`);
    }

    // bounding box is always lat/lon
    const extent = featureType.boundingBox ?
        bboxToExtent(featureType.boundingBox, 'EPSG:4326') :
        undefined;

    return {
        source: new WFSSource({
            url,
            typeName: featureType.name,
            crs,
            format,
            version: endpoint.getVersion(),
            extent,
        }),
        layerType: 'color',
    };
}

/**
 * Build the iTowns source feeding a layer of a service, together with the kind
 * of layer it should be attached to.
 *
 * @param {Endpoint} endpoint
 * @param {string} layerName
 * @returns {LayerSource}
 */
export function sourceFromEndpoint(endpoint, layerName) {
    if (endpoint instanceof WmtsEndpoint) {
        return wmtsSource(endpoint, layerName);
    }
    if (endpoint instanceof WmsEndpoint) {
        return wmsSource(endpoint, layerName);
    }
    if (endpoint instanceof WfsEndpoint) {
        return wfsSource(endpoint, layerName);
    }
    throw new Error('Unsupported OGC endpoint');
}
