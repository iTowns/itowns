import * as THREE from 'three';
import TileGeometry from 'Core/TileGeometry';
import Cache from 'Core/Scheduler/Cache';
import computeBuffers from 'Core/Prefab/computeBufferTileGeometry';
import OBB from 'Renderer/OBB';

const cacheBuffer = new Map();
export default function newTileGeometry(builder, params) {
    const { sharableExtent, quaternion, position } = builder.computeSharableExtent(params.extent);
    const south = sharableExtent.south.toFixed(6);
    const bufferKey = `${builder.projection}_${params.disableSkirt ? 0 : 1}_${params.segment}`;
    let promiseGeometry = Cache.get(bufferKey, params.level, south);

    // build geometry if doesn't exist
    if (!promiseGeometry) {
        let resolve;
        promiseGeometry = new Promise((r) => { resolve = r; });
        Cache.set(promiseGeometry, Cache.POLICIES.INFINITE, bufferKey, params.level, south);

        params.extent = sharableExtent;
        params.center = builder.center(params.extent).clone();
        // Read previously cached values (index and uv.wgs84 only depend on the # of triangles)
        let cachedBuffers = cacheBuffer.get(bufferKey);
        params.buildIndexAndUv_0 = !cachedBuffers;
        params.builder = builder;
        return Promise.resolve(computeBuffers(params)).then((buffers) => {
            if (!cachedBuffers) {
                cachedBuffers = {};
                cachedBuffers.index = new THREE.BufferAttribute(buffers.index, 1);
                cachedBuffers.uv = new THREE.BufferAttribute(buffers.uvs[0], 2);

                // Update cacheBuffer
                cacheBuffer.set(bufferKey, cachedBuffers);
            }

            buffers.index = cachedBuffers.index;
            buffers.uvs[0] = cachedBuffers.uv;
            buffers.position = new THREE.BufferAttribute(buffers.position, 3);
            buffers.normal = new THREE.BufferAttribute(buffers.normal, 3);
            if (params.builder.uvCount > 1) {
                buffers.uvs[1] = new THREE.BufferAttribute(buffers.uvs[1], 1);
            }

            const geometry = new TileGeometry(params, buffers);
            geometry.OBB = new OBB(geometry.boundingBox.min, geometry.boundingBox.max);

            geometry._count = 0;
            geometry.dispose = () => {
                geometry._count--;
                if (geometry._count == 0) {
                    THREE.BufferGeometry.prototype.dispose.call(geometry);
                    Cache.delete(bufferKey, params.level, south);
                }
            };
            resolve(geometry);
            return { geometry, quaternion, position };
        });
    }

    return promiseGeometry.then(geometry => ({ geometry, quaternion, position }));
}
