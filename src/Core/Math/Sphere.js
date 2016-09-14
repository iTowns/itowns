import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';


function Sphere(center,radius) {

	this.center = defaultValue(center,new THREE.Vector3());
	this.radius = defaultValue(radius,1.0);

}

Sphere.prototype.constructor = Sphere;

Sphere.prototype.setCenter = function(center) {

	this.center.copy(center);
};

Sphere.prototype.setRadius = function(radius) {

	this.radius = radius;
};

var vector = new THREE.Vector3();

Sphere.prototype.intersectWithRay = function(ray) {

    var pc = ray.closestPointToPoint(this.center);
    var a = pc.length();

    if (a > this.radius)
        return undefined; // new THREE.Vector3();

    if (ray.origin.length() > this.radius) {
        var d = ray.direction.clone();
        var b = Math.sqrt(this.radius * this.radius - a * a);
        d.setLength(b);

        return vector.subVectors(pc, d);
    } else
        return undefined;

}

export default Sphere;
