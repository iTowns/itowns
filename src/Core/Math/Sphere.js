import * as THREE from 'three';

function Sphere(center, radius) {
    this.center = center || new THREE.Vector3();
    this.radius = radius || 1.0;
}

Sphere.prototype.constructor = Sphere;

Sphere.prototype.setCenter = function setCenter(center) {
    this.center.copy(center);
};

Sphere.prototype.setRadius = function setRadius(radius) {
    this.radius = radius;
};

const vector = new THREE.Vector3();
const pc = new THREE.Vector3();

Sphere.prototype.intersectWithRayNoMiss = function intersectWithRayNoMiss(ray) {
    ray.closestPointToPoint(this.center, pc);
    let a = pc.length();
    let d;
    let b;

    // TODO: recompute mirror ray
    // If the ray miss sphere, we recompute the new ray with point symetric to tangent sphere
    if (a > this.radius) {
        // mirror point is symetric of pc
        // The mirror ray must pass through the point mirrorPoint
        const mirrorPoint = pc.clone().setLength(this.radius * 2 - a);

        // Compute the new direction
        d = ray.direction.subVectors(mirrorPoint, ray.origin).normalize();

        // Classic intersection with the new ray
        ray.closestPointToPoint(this.center, pc);
        a = pc.length();

        b = Math.sqrt(this.radius * this.radius - a * a);
        d.setLength(b);

        return vector.addVectors(pc, d);
    }

    // TODO: check all intersections : if (ray.origin.length() > this.radius)
    d = ray.direction.clone();
    b = Math.sqrt(this.radius * this.radius - a * a);
    d.setLength(b);

    return vector.subVectors(pc, d);
};

Sphere.prototype.intersectWithRay = function intersectWithRay(ray) {
    ray.closestPointToPoint(this.center, pc);
    const a = pc.length();
    if (a > this.radius) return undefined;
    const d = ray.direction.clone();
    const b = Math.sqrt(this.radius * this.radius - a * a);
    d.setLength(b);
    return vector.subVectors(pc, d);
};

export default Sphere;
