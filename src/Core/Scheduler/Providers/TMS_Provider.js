import * as THREE from 'three';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Extent from '../../Geographic/Extent';

function TMS_Provider() {
}

TMS_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    if (!layer.extent) {
        throw new Error(`Missing extent property for layer '${layer.id}'`);
    }
    if (!layer.projection) {
        throw new Error(`Missing projection property for layer '${layer.id}'`);
    }
    layer.extent = new Extent(layer.projection, ...layer.extent);
    layer.origin = layer.origin || (layer.protocol == 'xyz' ? 'top' : 'bottom');
    if (!layer.options.zoom) {
        layer.options.zoom = {
            min: 0,
            max: 18,
        };
    }
};

TMS_Provider.prototype.url = function url(coTMS, layer) {
    /* eslint-disable no-template-curly-in-string */
    return layer.url.replace('${z}', coTMS.zoom)
        .replace('${y}', coTMS.row)
        .replace('${x}', coTMS.col);
    /* eslint-enable no-template-curly-in-string */
};

TMS_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const tile = command.requester;
    const coordTMS = tile.getCoordsForLayer(layer)[0];
    const coordTMSParent = (command.targetLevel < coordTMS.zoom) ?
        OGCWebServiceHelper.WMTS_WGS84Parent(coordTMS, command.targetLevel) :
        undefined;

    const url = this.url(coordTMSParent || coordTMS, layer);

    return OGCWebServiceHelper.getColorTextureByUrl(url, layer.networkOptions).then((texture) => {
        const result = {};
        result.texture = texture;
        result.texture.coords = coordTMSParent || coordTMS;
        result.pitch = coordTMSParent ?
            coordTMS.offsetToParent(coordTMSParent) :
            new THREE.Vector4(0, 0, 1, 1);
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }
        return result;
    });
};

TMS_Provider.prototype.tileTextureCount = function tileTextureCount(tile, layer) {
    return this.tileInsideLimit(tile, layer) ? 1 : 0;
};

TMS_Provider.prototype.tileInsideLimit = function tileInsideLimit(tile, layer, targetLevel) {
    // assume 1 TMS texture per tile (ie: tile geometry CRS is the same as layer's CRS)
    let tmsCoord = tile.getCoordsForLayer(layer)[0];

    if (targetLevel < tmsCoord.zoom) {
        tmsCoord = OGCWebServiceHelper.WMTS_WGS84Parent(tmsCoord, targetLevel);
    }

    return layer.options.zoom.min <= tmsCoord.zoom &&
            tmsCoord.zoom <= layer.options.zoom.max;
};

export default TMS_Provider;
