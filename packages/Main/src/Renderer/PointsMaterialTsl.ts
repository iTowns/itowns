import * as THREE from 'three/webgpu';
import { color, uv, Fn, uniform, float, int, defined, depth } from 'three/tsl';

const pointsMaterialTsl = new THREE.PointsNodeMaterial();

const diffuse = uniform(new THREE.Vector3()).setName('diffuse');
const opacity = uniform(float(0)).setName('opacity');
const gamma = uniform(float(0)).setName('gamma');
const ambientBoost = uniform(float(0)).setName('ambientBoost');
const picking = uniform(false).setName('picking');
const shape = uniform(int(0)).setName('shape');

const main = Fn(() => {
    uv().sub(0.5).length().greaterThan(0.5)
        .discard();
    if (defined('USE_LOGARITHMIC_DEPTH_BUFFER')) {
        depth.assign(viewZToLogarithmicDepth);
    }
});

pointsMaterialTsl.colorNode = main();

export default pointsMaterialTsl;
