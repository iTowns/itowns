import * as THREE from 'three';
import ItownsPointMaterial from 'Renderer/ItownsPointMaterial';


const Points = function Points(options) {
    THREE.Points.call(this);

    if (options === undefined)
      { throw new Error('options is required'); }

    this.positions = [];
    this.colors = [];
    this.sizes = [];
    this.geometry = new THREE.BufferGeometry();
    this.material = new ItownsPointMaterial(options);
};

Points.prototype = Object.create(THREE.Points.prototype);
Points.prototype.constructor = Points;

Points.prototype.addPoint = function addPoint(v, c, s) {
    if (v instanceof THREE.Vector3) {
        this.positions.push(v.x, v.y, v.z);

        if (c instanceof THREE.Color)
      { this.colors.push(c.r, c.g, c.b); }

        this.sizes.push(s);
    }
};

Points.prototype.process = function process() {
    this.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.positions), 3));
    this.geometry.addAttribute('customColor', new THREE.BufferAttribute(new Float32Array(this.colors), 3));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(new Float32Array(this.sizes), 1));
};


export default Points;

