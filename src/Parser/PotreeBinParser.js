import * as THREE from 'three';

export default {
    /** @module PotreeBinParser */
    /** Parse .bin PotreeConverter format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const view = new DataView(buffer);
        // Format: X1,Y1,Z1,R1,G1,B1,A1,[...],XN,YN,ZN,RN,GN,BN,AN
        const numPoints = Math.floor(buffer.byteLength / 16);

        const positions = new Float32Array(3 * numPoints);
        const colors = new Uint8Array(4 * numPoints);

        const box = new THREE.Box3();
        box.min.set(Infinity, Infinity, Infinity);
        box.max.set(-Infinity, -Infinity, -Infinity);
        const tmp = new THREE.Vector3();

        let offset = 0;
        for (let i = 0; i < numPoints; i++) {
            positions[3 * i] = view.getUint32(offset + 0, true);
            positions[3 * i + 1] = view.getUint32(offset + 4, true);
            positions[3 * i + 2] = view.getUint32(offset + 8, true);

            tmp.fromArray(positions, 3 * i);
            box.min.min(tmp);
            box.max.max(tmp);

            colors[4 * i] = view.getUint8(offset + 12);
            colors[4 * i + 1] = view.getUint8(offset + 13);
            colors[4 * i + 2] = view.getUint8(offset + 14);
            colors[4 * i + 3] = 255;

            offset += 16;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
        geometry.boundingBox = box;

        return Promise.resolve(geometry);
    },
};
