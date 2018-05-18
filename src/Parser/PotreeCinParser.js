import * as THREE from 'three';

export default {
    /** @module PotreeCinParser */
    /** Parse .cin PotreeConverter format (see {@link https://github.com/peppsac/PotreeConverter/tree/custom_bin}) and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the cin buffer.
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        // Format: MinX,MinY,MinZ,MaxX,MaxY,MaxZ,X1,Y1,Z1,[...],XN,YN,ZN,R1,G1,B1,A1,[...],RN,GN,BN,AN
        const view = new DataView(buffer, 0, 6 * 4);
        const min = new THREE.Vector3(view.getFloat32(0, true), view.getFloat32(4, true), view.getFloat32(8, true));
        const max = new THREE.Vector3(view.getFloat32(12, true), view.getFloat32(16, true), view.getFloat32(20, true));
        const box = new THREE.Box3(min, max);

        const numPoints = Math.floor((buffer.byteLength - 24) / 16);

        const positions = new Float32Array(buffer, 24, 3 * numPoints);
        const colors = new Uint8Array(buffer, 24 + 3 * 4 * numPoints, 4 * numPoints);

        const geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
        geometry.boundingBox = box;

        return Promise.resolve(geometry);
    },
};
