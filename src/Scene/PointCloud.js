import THREE from 'THREE';
import Potree from 'potree';
import Layer from 'Scene/Layer';
import PointClassificationVS from 'Renderer/Shader/PointClassificationVS.glsl'
import PointClassificationFS from 'Renderer/Shader/PointClassificationFS.glsl'

var potreeInstance = null;
var loaders = [];

function PointCloud() {
    Layer.call(this);

    Potree.pointBudget = 10*1000*1000;

    //change axis
    potreeInstance = new THREE.Object3D();

    // potreeInstance.quaternion.multiply(
    //         new THREE.Quaternion().setFromAxisAngle(
    //             new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));
    // potreeInstance.quaternion.multiply(
    //         new THREE.Quaternion().setFromAxisAngle(
    //             new THREE.Vector3( 0, 0, 1 ),  Math.PI ));

var minx = 298250;
var maxx = 302750;
var miny = 5039250;
var maxy = 5043750;
var minz = 39.27;
var maxz = 90.56;

var geometry = new THREE.BoxGeometry(maxx - minx , maxy - miny, maxz - minz);
var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
material.transparent = true;
material.opacity = 0.0;
var cube = new THREE.Mesh( geometry, material );
cube.position.copy(new THREE.Vector3((maxx + minx) * 0.5, (maxy + miny) * 0.5, (maxz + minz) * 0.5));
this.add( cube );

    this.add(potreeInstance);
}

PointCloud.prototype = Object.create(Layer.prototype);

PointCloud.prototype.constructor = PointCloud;

PointCloud.prototype.update = function(camera, renderer) {
    if ( potreeInstance )
        Potree.updatePointClouds(potreeInstance.children, camera, renderer);
};

PointCloud.prototype.load = function(url) {
    if(url.indexOf("greyhound://") === 0)
        this.load_greyhoud(url);
    else if(url.indexOf("cloud.js") > 0)
        this.load_cloud(url);
}

PointCloud.prototype.load_greyhoud = function(url) {
    var loader = new Potree.GreyhoundLoader();


    loader.load(url, function(geometry) {
        var pointcloud;
        var material;

        // can't use this method since potree depends on three r71 but itowns
        // uses r79
        // if (false) {
        //     pointcloud = new Potree.PointCloudOctree(geometry);
        //     pointcloud.material.size = 100;
        //     pointcloud.material.pointColorType = Potree.PointColorType.CLASSIFICATION;
        //     pointcloud.material.lights = false;
        // }

        // reimplementation of classification colorization based on three point shaders
        {
            material = new THREE.ShaderMaterial({
                uniforms: {
                    size: { value: 1.0 },
                    scale: { value: 2500.0 },
                    classificationMask: { value: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }
                }
            });
            material.vertexShader = PointClassificationVS;
            material.fragmentShader = PointClassificationFS;
            pointcloud = new Potree.PointCloudOctree(geometry, material);
        }

        // alternative using three js stock point materials. Doesn't support
        // classification
        // {
        //     material = new THREE.Material();
        //     material.isPointsMaterial = true;
        //     material.size = 50;
        //     material.vertexColors = THREE.VertexColors;
        //     material.sizeAttenuation = false;
        //     material.lights = false;
        //     material.map = null;
        //     material._needsUpdate = true;
        //     material.update();
        //     pointcloud = new Potree.PointCloudOctree(geometry, material);
        // }

        potreeInstance.add(pointcloud);

        loaders.push(loader);
    });
}

PointCloud.prototype.load_cloud = function(url) {
    var loader = new Potree.POCLoader();

    loader.load(url, function(geometry) {
        var pointcloud = new Potree.PointCloudOctree(geometry);
        pointcloud.material.size = 10;
        pointcloud.material.pointColorType = Potree.PointColorType.CLASSIF

        var pos = new THREE.Vector3 (4201215.424138484, 171429.945145441,
                4779294.873914789);
        pointcloud.position.copy(pos);

        potreeInstance.add(pointcloud);
    });

    loaders.push(loader);
}

export default PointCloud;
