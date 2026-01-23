import { Vector3 } from 'three';
import {
    Coordinates,
    CopcSource, CopcLayer,
    EntwinePointTileSource, EntwinePointTileLayer,
    PotreeSource, PotreeLayer,
    Potree2Source, Potree2Layer,
} from 'itowns';

class Potree extends PotreeSource {
    constructor(source) {
        const url = new URL(source.url);
        const file = url.pathname.split('/').pop();
        super({ ...source, url: new URL('.', url.href).href, file });
    }
}

class Potree2 extends Potree2Source {
    constructor(source) {
        const url = new URL(source.url);
        const file = url.pathname.split('/').pop();
        super({ ...source, url: new URL('.', url.href).href, file });
    }
}

export function getFormat(url, format) {
    if (format !== 'auto') { return format; }
    if (url.includes('.copc.laz')) { return 'copc'; }
    if (url.includes('ept.json')) { return 'ept'; }
    if (url.includes('cloud.js')) { return 'potree'; }
    if (url.includes('metadata.json')) { return 'potree2'; }
    throw new Error(`Cannot infer format from URL ${url}`);
}

export function getPointCloudClass(format) {
    if (format === 'copc') {
        return { Source: CopcSource, Layer: CopcLayer };
    }
    if (format === 'ept') {
        return { Source: EntwinePointTileSource, Layer: EntwinePointTileLayer };
    }
    if (format === 'potree') {
        return { Source: Potree, Layer: PotreeLayer };
    }
    if (format === 'potree2') {
        return { Source: Potree2, Layer: Potree2Layer };
    }

    throw new Error(`Unsupported format ${format}`);
}

export function zoomToLayer(view, layer) {
    const camera = view.camera3D;
    const obb = layer.root.voxelOBB;

    const center = obb.box3D.getCenter(new Vector3());
    obb.localToWorld(center);
    const length = obb.box3D.getSize(new Vector3()).length();

    const fov = camera.fov * (Math.PI / 180);
    const radius = length / 2;
    const distance = radius / Math.tan(fov / 2);

    const up = new Vector3(0, 0, 1);
    camera.position.copy(center).addScaledVector(up, distance);
    camera.far = 2 * distance;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    view.notifyChange(camera);
}

export function zoomToLayerGlobe(view, layer) {
    const lookAt = layer.root.clampOBB.position;
    const coordLookAt = new Coordinates(view.referenceCrs).setFromVector3(lookAt);

    const size = new Vector3();
    layer.root.voxelOBB.box3D.getSize(size);

    view.controls.lookAtCoordinate({
        coord: coordLookAt,
        range: 2 * size.length(),
    }, false);
}
