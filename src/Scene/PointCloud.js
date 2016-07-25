import THREE from 'THREE';
import Potree from 'potree';
import Layer from 'Scene/Layer';



var potreeInstance = null;

function PointCloud() {
    Layer.call(this);

    this.loader = new Potree.GreyhoundLoader();

    //change axis
    potreeInstance = new THREE.Object3D();

    potreeInstance.quaternion.multiply(
            new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));
    potreeInstance.quaternion.multiply(
            new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3( 0, 0, 1 ),  Math.PI ));

    this.add(potreeInstance);

    this.loader.load("greyhound://192.168.1.12:5000/greyhound/", function(geometry) {
        var material = new THREE.PointsMaterial( { size: 10000,
            vertexColors: THREE.VertexColors } );
        var pointcloud = new Potree.PointCloudOctree(geometry, material);

        var bottomLeft = new THREE.Vector3 (4201215.424138484,
                171429.945145441, 4785694.873914789);
        pointcloud.position.copy(bottomLeft);

        potreeInstance.add(pointcloud);
});
}

PointCloud.prototype = Object.create(Layer.prototype);

PointCloud.prototype.constructor = PointCloud;

PointCloud.prototype.update = function(camera, renderer) {
    if ( potreeInstance )
        Potree.updatePointClouds(potreeInstance.children, camera, renderer);
};

export default PointCloud;
