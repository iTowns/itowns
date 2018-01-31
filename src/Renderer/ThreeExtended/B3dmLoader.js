import * as THREE from 'three';
import GLTFLoader from './GLTFLoader';
import LegacyGLTFLoader from './deprecated/LegacyGLTFLoader';
import BatchTable from './BatchTable';

const matrixChangeUpVectorZtoY = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);
// For gltf rotation
const matrixChangeUpVectorZtoX = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);

function B3dmLoader() {
    this.glTFLoader = new GLTFLoader();
    this.LegacyGLTFLoader = new LegacyGLTFLoader();
}

function filterUnsupportedSemantics(obj) {
    // see GLTFLoader GLTFShader.prototype.update function
    const supported = [
        'MODELVIEW',
        'MODELVIEWINVERSETRANSPOSE',
        'PROJECTION',
        'JOINTMATRIX'];

    if (obj.gltfShader) {
        const names = [];
        // eslint-disable-next-line guard-for-in
        for (const name in obj.gltfShader.boundUniforms) {
            names.push(name);
        }
        for (const name of names) {
            const semantic = obj.gltfShader.boundUniforms[name].semantic;
            if (supported.indexOf(semantic) < 0) {
                delete obj.gltfShader.boundUniforms[name];
            }
        }
    }
}
// parse for RTC values
function applyOptionalCesiumRTC(data, gltf, textDecoder) {
    const headerView = new DataView(data, 0, 20);
    const contentArray = new Uint8Array(data, 20, headerView.getUint32(12, true));
    const content = textDecoder.decode(new Uint8Array(contentArray));
    const json = JSON.parse(content);
    if (json.extensions && json.extensions.CESIUM_RTC) {
        gltf.position.fromArray(json.extensions.CESIUM_RTC.center);
        gltf.updateMatrixWorld(true);
    }
}

B3dmLoader.prototype.parse = function parse(buffer, gltfUpAxis, url, textDecoder) {
    if (!buffer) {
        throw new Error('No array buffer provided.');
    }

    const view = new DataView(buffer, 4);   // starts after magic

    let byteOffset = 0;
    const b3dmHeader = {};
    let batchTable = {};

    // Magic type is unsigned char [4]
    b3dmHeader.magic = textDecoder.decode(new Uint8Array(buffer, 0, 4));
    if (b3dmHeader.magic) {
        // Version, byteLength, batchTableJSONByteLength, batchTableBinaryByteLength and batchTable types are uint32
        b3dmHeader.version = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.byteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.FTJSONLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.FTBinaryLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.BTJSONLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.BTBinaryLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        if (b3dmHeader.BTJSONLength > 0) {
            const sizeBegin = 28 + b3dmHeader.FTJSONLength + b3dmHeader.FTBinaryLength;
            batchTable = BatchTable.parse(
                buffer.slice(sizeBegin, b3dmHeader.BTJSONLength + sizeBegin),
                textDecoder);
        }
        // TODO: missing feature and batch table
        return new Promise((resolve/* , reject */) => {
            const onload = (gltf) => {
                for (const scene of gltf.scenes) {
                    scene.traverse(filterUnsupportedSemantics);
                }
                // Rotation managed
                if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                    gltf.scene.applyMatrix(matrixChangeUpVectorZtoY);
                } else if (gltfUpAxis === 'X') {
                    gltf.scene.applyMatrix(matrixChangeUpVectorZtoX);
                }

                // RTC managed
                applyOptionalCesiumRTC(buffer.slice(28 + b3dmHeader.FTJSONLength +
                    b3dmHeader.FTBinaryLength + b3dmHeader.BTJSONLength +
                    b3dmHeader.BTBinaryLength), gltf.scene, textDecoder);

                const b3dm = { gltf, batchTable };
                resolve(b3dm);
            };

            const gltfBuffer = buffer.slice(28 + b3dmHeader.FTJSONLength +
                b3dmHeader.FTBinaryLength + b3dmHeader.BTJSONLength +
                b3dmHeader.BTBinaryLength);

            const version = new DataView(gltfBuffer, 0, 20).getUint32(4, true);

            if (version === 1) {
                this.LegacyGLTFLoader.parse(gltfBuffer, onload, THREE.LoaderUtils.extractUrlBase(url));
            } else {
                this.glTFLoader.parse(gltfBuffer, THREE.LoaderUtils.extractUrlBase(url), onload);
            }
        });
    } else {
        throw new Error('Invalid b3dm file.');
    }
};

export default B3dmLoader;
