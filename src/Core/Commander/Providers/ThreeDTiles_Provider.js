/**
 * Created On: 2016-11-8
 * Class: ThreeDTiles_Provider
 * Description:
 */
import * as THREE from 'three';
import Provider from 'Core/Commander/Providers/Provider';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import IoDriver_B3DM from 'Core/Commander/Providers/IoDriver_B3DM';
import IoDriver_JSON from 'Core/Commander/Providers/IoDriver_JSON';

function ThreeDTiles_Provider(/*options*/) {
    //Constructor

    Provider.call(this, new IoDriver_JSON());
    this.cache = CacheRessource();
}

ThreeDTiles_Provider.prototype = Object.create(Provider.prototype);

ThreeDTiles_Provider.prototype.constructor = ThreeDTiles_Provider;

ThreeDTiles_Provider.prototype.removeLayer = function( /*idLayer*/ ) {

}

ThreeDTiles_Provider.prototype.preprocessDataLayer = function(/*layer*/) {

};

import proj4 from 'proj4';
import geoJsonToThree from 'Renderer/ThreeExtented/GeoJSONToThree'
import GeoCoordinate, {UNIT} from 'Core/Geographic/GeoCoordinate'
import Ellipsoid from 'Core/Math/Ellipsoid'
import FeatureMesh from 'Renderer/FeatureMesh'
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile'
import Projection from 'Core/Geographic/Projection'
import BoundingBox from 'Scene/BoundingBox'

ThreeDTiles_Provider.prototype.getBox = function(boundingVolume) {
    if(boundingVolume.region) {
        let region = boundingVolume.region;
        // TODO: set unitradian
        return new BoundingBox(region[0], region[2], region[1], region[3], region[4], region[5]);
    } else if(boundingVolume.box) {
        let box = boundingVolume.box;
        let center = new THREE.Vector3(box[0], box[1], box[2]);
        let w = center.x - box[3] / 2;
        let e = center.x + box[3] / 2;
        let s = center.y - box[3] / 2;
        let n = center.y + box[7] / 2;
        let b = center.z - box[11] / 2;
        let t = center.z + box[11] / 2;

        return new BoundingBox(w, e, s, n, b, t);
    }
}

ThreeDTiles_Provider.prototype.geojsonToMesh = function(geoJson, ellipsoid, parameters, builder) {
    // Temporary transform from EPSG:3946 to world coordinates
    let proj3946 = '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    let proj4326 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

    let transform = new THREE.Matrix4();
    let center = new THREE.Vector3((parameters.bbox.west() + parameters.bbox.east()) / 2,
        (parameters.bbox.south() + parameters.bbox.north()) / 2,
        0/*(parameters.bbox.top() + parameters.bbox.bottom()) / 2*/);
    let coordGlobe = proj4(proj3946, proj4326, [center.x, center.y]);
    let geoCoord = new GeoCoordinate(parseFloat(coordGlobe[0]), parseFloat(coordGlobe[1]), parseFloat(center.z), UNIT.DEGREE);
    let pgeo = ellipsoid.cartographicToCartesian(geoCoord);
    let normal = ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
    let quat = (new THREE.Quaternion()).setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
    let quat2 = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan(normal.y / normal.x));
    quat.multiply(quat2);
    transform.compose(pgeo, quat, new THREE.Vector3(1,1,1));


    let features = geoJson.geometries.features;

    let geometry;
    let color = /*new THREE.Color(Math.random(),Math.random(),Math.random());//*/new THREE.Color(180/255,147/255,128/255);

    if(geoJson.geometries.features[0].properties.zmax !== undefined) {
        let height = geoJson.geometries.features[0].properties.zmax - geoJson.geometries.features[0].properties.zmin;
        let offset;
        let shape = new THREE.Shape();
        var extrudeSettings = {
            amount: height,
            bevelEnabled: true,
            bevelThickness: height / 10,
            bevelSize: height / 10,
            bevelSegments: 2
        };

        for(let r = 0; r < features.length; r++) {
            let coords = features[r].geometry.coordinates;
            for(let i = 0; i < coords.length; i++) {
                let polygon = coords[i][0]; // TODO: support holes
                let pathPoints = [];
                offset = new THREE.Vector2(center.x, center.y)
                for (let j = 0; j < polygon.length - 1; ++j) {  // skip redundant point
                    pathPoints[j] = (new THREE.Vector2(polygon[j][0], polygon[j][1])).sub(offset);
                }
                // shape creation
                shape = new THREE.Shape(pathPoints);
                if (geometry) {
                    geometry.merge(new THREE.ExtrudeGeometry( shape, extrudeSettings ))
                } else {
                    geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                }
            }
        }

        geometry.translate(0, 0, geoJson.geometries.features[0].properties.zmin);
        geometry.applyMatrix(transform);
        geometry.computeBoundingSphere();
    } else {
        let translation = (new THREE.Matrix4()).makeTranslation(-center.x, -center.y, -center.z);
        transform.multiply(translation);
        let threeData = geoJsonToThree.convert(geoJson);
        geometry = threeData.geometries;
        geometry.applyMatrix(transform);
        geometry.computeBoundingSphere();
    }
    let box = parameters.bbox;
    let mesh = new FeatureMesh({bbox: box}, builder);
    mesh.setGeometry(geometry);
    mesh.frustumCulled = false;
    mesh.geometricError = parameters.geometricError;
    mesh.tileId = parameters.tileId;
    mesh.maxChildrenNumber = parameters.maxChildrenNumber;
    mesh.loaded = true;
    mesh.additiveRefinement = parameters.additive;
    mesh.material.uniforms.diffuseColor.value = color;

    return mesh;
};

ThreeDTiles_Provider.prototype.b3dmToMesh = function(result, ellipsoid, parameters, builder/*, transform*/) {
    var mesh = result.scene.children[0].children[1];

    mesh.geometry.scale(25000, 25000, 25000);

    var matrix = new THREE.Matrix4();
    matrix.makeRotationX(Math.PI / 2);

    /*var transformMatrix = new THREE.Matrix4();
    transformMatrix.set(transform[0], transform[1], transform[2], transform[3],
        transform[4], transform[5], transform[6], transform[7],
        transform[8], transform[9], transform[10], transform[11],
        transform[12], transform[13], transform[14], transform[15]);*/
    //transformMatrix.makeRotationZ(Math.PI / 2);
    /*if(transform)
        mesh.geometry.applyMatrix(transformMatrix);*/
    //else
    mesh.geometry.rotateZ(-Math.PI / 8);
    mesh.geometry.translate(4501130, 4495279, -1000000);//-372353);

    //Use ellipsoid to put data from ellipsoid to cartesian
    //var posArray = mesh.geometry.attributes.position.array;
    /*for (var i = 0; i < pos.length; i + 3) {

    }*/

    var box;
    if(mesh.geometry.boundingBox != null)
        box = new BoundingBox(mesh.bbox[0], mesh.bbox[2], mesh.bbox[1], mesh.bbox[3], mesh.bbox[4], mesh.bbox[5]);
    else if(mesh.geometry.boundingSphere) {
        var bs = mesh.geometry.boundingSphere;
        var c = bs.center;
        var r = bs.radius / 2;
        box = new BoundingBox(c.x - r, c.x + r, c.y - r, c.y + r, c.z - r, c.z + r);
    }
    var fMesh = new FeatureMesh({bbox: box}, builder);
    fMesh.setGeometry(mesh.geometry);
    fMesh.material.uniforms.uDiffuse = mesh.material.uniforms.u_diffuse;
    return fMesh;
};

ThreeDTiles_Provider.prototype.getData = function(tile, layer, params) {

    var ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137
    });
    var builder  = new BuilderEllipsoidTile(ellipsoid, new Projection());

    // Parsing metadata
    var parameters = {
        bbox: this.getBox(params.metadata.boundingVolume),
        urlSuffix: params.metadata.content ? params.metadata.content.url : undefined,
        maxChildrenNumber: params.metadata.children ? params.metadata.children.length : 0,
        tileId: params.metadata.tileId,
        additive: params.metadata.refine === "add",
        geometricError: params.metadata.geometricError
    };

    if(parameters.urlSuffix) {
        var url = layer.url + parameters.urlSuffix;

        var supportedFormats = {
            'geoJson': this.geojsonToMesh.bind(this),
            'b3dm':    this.b3dmToMesh.bind(this)
        };

        //url = 'data/glTF/Duck.gltf';

        // TODO: ioDrive should be binary?
        return this._IoDriver.read(url).then(function(result) {
            if (result !== undefined) {
                var func;
                if(result.magic) {
                    func = supportedFormats['b3dm'];
                } else {
                    func = supportedFormats['geoJson'];
                }
                var mesh = func(result, ellipsoid, parameters, builder, layer.transform);
                tile.add(mesh);
                this.cache.addRessource(url, result);
                return mesh;
            } else {
                this.cache.addRessource(url, null);
                return null;
            }
        }.bind(this));
    } else {
        return new Promise(function(resolve/*, reject*/) {
            // Temporary transform from EPSG:3946 to world coordinates
            let proj3946 = '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
            let proj4326 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

            let transform = new THREE.Matrix4();
            let center = new THREE.Vector3((parameters.bbox.west() + parameters.bbox.east()) / 2,
                (parameters.bbox.south() + parameters.bbox.north()) / 2,
                0/*(parameters.bbox.top() + parameters.bbox.bottom()) / 2*/);
            let coordGlobe = proj4(proj3946, proj4326, [center.x, center.y]);
            let geoCoord = new GeoCoordinate(parseFloat(coordGlobe[0]), parseFloat(coordGlobe[1]), parseFloat(center.z), UNIT.DEGREE);
            let pgeo = ellipsoid.cartographicToCartesian(geoCoord);
            let normal = ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
            let quat = (new THREE.Quaternion()).setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
            let quat2 = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan(normal.y / normal.x));
            quat.multiply(quat2);
            transform.compose(pgeo, quat, new THREE.Vector3(1,1,1));

            /*let dx = (parameters.bbox.east() - parameters.bbox.west()) / 2;
            let dy = (parameters.bbox.north() - parameters.bbox.south()) / 2;
            let dz = (parameters.bbox.top() - parameters.bbox.bottom()) / 2;*/
            let radius = 1;//Math.sqrt(dx * dx + dy * dy + dz * dz);
            let geometry = new THREE.SphereGeometry(radius);
            // TODO: geometry should be empty
            geometry.applyMatrix(transform);
            geometry.computeBoundingSphere();

            let mesh = new FeatureMesh({bbox: parameters.bbox}, builder);
            mesh.setGeometry(geometry);
            mesh.frustumCulled = false;
            mesh.tileId = parameters.tileId;
            mesh.maxChildrenNumber = parameters.maxChildrenNumber;
            mesh.loaded = true;
            mesh.additiveRefinement = parameters.additive;
            mesh.geometricError = parameters.geometricError;
            tile.add(mesh);
            resolve(mesh);
        })
    }
}

ThreeDTiles_Provider.prototype.executeCommand = function(command) {

    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    return this.getData(tile, layer, command.paramsFunction).then(function(result) {
        return command.resolve(result);
    });
};

export default ThreeDTiles_Provider;
