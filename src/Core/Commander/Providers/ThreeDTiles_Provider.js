/**
 * Created On: 2016-11-8
 * Class: ThreeDTiles_Provider
 * Description:
 */


import Provider from 'Core/Commander/Providers/Provider';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
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
import * as THREE from 'three'

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
        urlSuffix: params.metadata.content.url,
        maxChildrenNumber: params.metadata.children ? params.metadata.children.length : 0,
        additive: false// params.metadata.refine === "add"
    };

    var url = layer.url + parameters.urlSuffix;

    // TODO: ioDrive should be binary?
    return this._IoDriver.read(url).then(function(result) {
        try {
            if (result !== undefined) {
                // TODO: check magic bytes
                /*var supportedFormats = {
                    'image/png':           this.getColorTexture.bind(this),
                    'image/jpg':           this.getColorTexture.bind(this),
                    'image/jpeg':          this.getColorTexture.bind(this),
                    'image/x-bil;bits=32': this.getXbilTexture.bind(this)
                };
                var func = supportedFormats[layer.options.mimetype];*/


                // TODO: create new tile
                var geoJson = result;
                let features = geoJson.geometries.features;

                var geometry;
                var proj3946 = '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
                var proj4326 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

                let transform = new THREE.Matrix4();
                let center = new THREE.Vector3((parameters.bbox.west() + parameters.bbox.east()) / 2,
                    (parameters.bbox.south() + parameters.bbox.north()) / 2,
                    (parameters.bbox.top() + parameters.bbox.bottom()) / 2);
                let coordGlobe = proj4(proj3946, proj4326, [center.x, center.y]);
                let geoCoord = new GeoCoordinate(parseFloat(coordGlobe[0]), parseFloat(coordGlobe[1]), parseFloat(center.z), UNIT.DEGREE);
                let pgeo = ellipsoid.cartographicToCartesian(geoCoord);
                let normal = ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
                let quat = (new THREE.Quaternion()).setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
                let quat2 = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan(normal.y / normal.x));
                quat.multiply(quat2);
                transform.compose(pgeo, quat, new THREE.Vector3(1,1,1));

                if(geoJson.geometries.features[0].properties.zmax !== undefined) {
                    let height = geoJson.geometries.features[0].properties.zmax - geoJson.geometries.features[0].properties.zmin;
                    let offset;
                    let shape = new THREE.Shape();
                    for(let r = 0; r < features.length; r++) {
                        let coords = features[r].geometry.coordinates;
                        for(let i = 0; i < coords.length; i++) {
                            let polygon = coords[i][0]; // TODO: support holes
                            let pathPoints = [];
                            offset = new THREE.Vector2(center.x, center.y)
                            for (let j = 0; j < polygon.length - 2; ++j) {  // skip redundant point
                                pathPoints[j] = (new THREE.Vector2(polygon[j][0], polygon[j][1])).sub(offset);
                            }
                            // shape creation
                            shape = new THREE.Shape(pathPoints);
                        }
                    }
                    var extrudeSettings = {
                        amount: height,
                        bevelEnabled: true,
                    	bevelThickness: height / 10,
                    	bevelSize: height / 10,
                    	bevelSegments: 2
                    };

                    geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
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
                var box = parameters.bbox;
                var mesh = new FeatureMesh({bbox: box}, builder);
                mesh.setGeometry(geometry);
                mesh.frustumCulled = false;
                mesh.geometricError = 43500;
                if(!parameters.urlSuffix.includes("D0")) mesh.geometricError = 43460;
                mesh.url = parameters.urlSuffix;
                mesh.maxChildrenNumber = parameters.maxChildrenNumber;
                mesh.loaded = true;
                mesh.additiveRefinement = parameters.additive;
                mesh.material.uniforms.diffuseColor.value = new THREE.Color(Math.random(), Math.random(), Math.random());
                console.log(mesh.material.uniforms.diffuseColor.value);

                tile.add(mesh);

                this.cache.addRessource(url, result);

                return mesh;
            } else {
                this.cache.addRessource(url, null);
                return null;
            }
        } catch(error) {
            console.error(error.message);
        }
    }.bind(this));


}

ThreeDTiles_Provider.prototype.executeCommand = function(command) {

    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    return this.getData(tile, layer, command.paramsFunction).then(function(result) {
        return command.resolve(result);
    });
};

export default ThreeDTiles_Provider;
