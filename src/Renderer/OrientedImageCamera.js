import * as THREE from 'three';

/**
 * @classdesc OrientedImageCamera is a ThreeJs camera adapted to photogrammetric description.
 * So we can build a ThreeJs perspective camera from size and focal information.
 */
class OrientedImageCamera extends THREE.PerspectiveCamera {
    /**
     * @constructor
     * @param {number|Vector2} size - image size in pixels (default: x=1024, y=x)
     * @param {number|Vector2} focal - focal length in pixels (default: x=1024, y=x)
     * @param {Vector2} center - principal point in pixels (default: size/2)
     * @param {number} near - Camera frustum near plane (default: see THREE.PerspectiveCamera).
     * @param {number} far - Camera frustum far plane (default: see THREE.PerspectiveCamera).
     * @param {number} skew - shear transform parameter (default: 0)
     * @param {number} aspect - aspect ratio of the camera (default: size.x/size.y).
     */
    constructor(size = 1024, focal = 1024, center, near = 0.1, far = 1000, skew, aspect) {
        size = size.isVector2 ? size : new THREE.Vector2(size, size);
        aspect = aspect || size.x / size.y;
        super(undefined, aspect, near, far);
        this.size = size;
        this.focal = focal.isVector2 ? focal : new THREE.Vector2(focal, focal);
        this.center = center || size.clone().multiplyScalar(0.5);
        this.skew = skew || 0;
        Object.defineProperty(this, 'fov', {
            get: () => Math.atan2(this.size.y, 2 * this.focal.y) * 360 / Math.PI,
            // setting the fov overwrites focal.x and focal.y
            set: (fov) => {
                var focal = 0.5 * this.size.y / Math.tan(fov * Math.PI / 360);
                this.focal.x = focal;
                this.focal.y = focal;
            },
        });
        this.updateProjectionMatrix();
    }

    // we override PerspectiveCamera.updateProjectionMatrix to
    // update the projection matrix depending on other variables
    // focal, center and size...
    updateProjectionMatrix() {
        if (!this.focal) {
            return;
        }
        const near = this.near;
        const sx = near / this.focal.x;
        const sy = near / this.focal.y;
        const left = -sx * this.center.x;
        const bottom = -sy * this.center.y;
        const right = left + sx * this.size.x;
        const top = bottom + sy * this.size.y;
        this.projectionMatrix.makePerspective(left, right, top, bottom, near, this.far);
        this.projectionMatrix.elements[4] = 2 * this.skew / this.size.x;

        // take zoom and aspect into account
        const textureAspect = this.size.x / this.size.y;
        const aspectRatio = this.aspect / textureAspect;
        const zoom = new THREE.Vector3(this.zoom, this.zoom, 1);
        if (aspectRatio > 1) {
            zoom.x /= aspectRatio;
        } else {
            zoom.y *= aspectRatio;
        }
        this.projectionMatrix.scale(zoom);
    }

    copy(source, recursive) {
        super.copy(source, recursive);
        this.size = source.size.clone();
        this.focal = source.focal.clone();
        this.center = source.center.clone();
        this.skew = source.skew;
        return this;
    }
}

export default OrientedImageCamera;
