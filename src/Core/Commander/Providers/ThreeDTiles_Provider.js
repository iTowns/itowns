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

ThreeDTiles_Provider.prototype.getData = function(tile, layer, params) {

    var ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137
    });
    var builder  = new BuilderEllipsoidTile(ellipsoid, new Projection());

    // Parsing metadata
    var parameters = {
        bbox: params.metadata.boundingVolume.region,
        urlSuffix: params.metadata.content.url,
        maxChildrenNumber: params.metadata.children ? params.metadata.children.length : 0,
        additive: params.metadata.refine === "add"
    };

    var url = layer.url + parameters.urlSuffix;

    // TODO: ioDrive should be binary?
    return this._IoDriver.read(url).then(function(result) {
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
            var proj3946 = '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
            var proj4326 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';
            for (var r = 0; r < features.length; r++) {
                let coords = features[r].geometry.coordinates;
                for(let i = 0; i < coords.length; i++) {
                    let polygon = coords[i][0];
                    if (polygon.length > 2) {
                        for (var j = 0; j < polygon.length - 1; ++j) {
                            let pt2DTab = polygon[j];
                            let coord = proj4(proj3946, proj4326, [pt2DTab[0], pt2DTab[1]]);
                            let geoCoord = new GeoCoordinate(parseFloat(coord[0]), parseFloat(coord[1]), parseFloat(pt2DTab[2]), UNIT.DEGREE);
                            let pgeo = ellipsoid.cartographicToCartesian(geoCoord);
                            geoJson.geometries.features[r].geometry.coordinates[i][0][j] = [pgeo.x, pgeo.y, pgeo.z];
                        }
                    }
                }
                //Change bbox crs
                let bbox = features[r].geometry.bbox;

                let coord1 = proj4(proj3946, proj4326, [bbox[0], bbox[1]]);
                let coord2 = proj4(proj3946, proj4326, [bbox[3], bbox[4]]);
                let geoCoord1 = new GeoCoordinate(parseFloat(coord1[0]), parseFloat(coord1[1]), parseFloat(bbox[2]), UNIT.DEGREE);
                let geoCoord2 = new GeoCoordinate(parseFloat(coord2[0]), parseFloat(coord2[1]), parseFloat(bbox[5]), UNIT.DEGREE);
                let pgeo1 = ellipsoid.cartographicToCartesian(geoCoord1);
                let pgeo2 = ellipsoid.cartographicToCartesian(geoCoord2);

                geoJson.geometries.features[r].geometry.bbox = [pgeo2.x, pgeo1.y, pgeo1.z, pgeo1.x, pgeo2.y, pgeo2.z];
            }
            var threeDatas = geoJsonToThree.convert(geoJson);
            var box = new BoundingBox(parameters.bbox[0], parameters.bbox[2], parameters.bbox[1], parameters.bbox[3], parameters.bbox[4], parameters.bbox[5]);
            var mesh = new FeatureMesh({bbox: box}, builder);
            mesh.setGeometry(threeDatas.geometries);
            mesh.frustumCulled = false;
            mesh.geometricError = 50000;
            mesh.url = parameters.urlSuffix;
            mesh.maxChildrenNumber = parameters.maxChildrenNumber;
            mesh.loaded = true;
            mesh.additiveRefinement = parameters.additive;

            tile.add(mesh);

            this.cache.addRessource(url, result);

            return mesh;
        } else {
            this.cache.addRessource(url, null);
            return null;
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
