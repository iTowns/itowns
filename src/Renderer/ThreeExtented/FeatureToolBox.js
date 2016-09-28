/**
 * Generated On: 2016-09-28
 * Class: FeatureToolBox
 * Description:
 */

import THREE 					from 'THREE';
import CVML 					from 'Core/Math/CVML';
import BoundingBox      		from 'Scene/BoundingBox';
import Ellipsoid 				from 'Core/Math/Ellipsoid';
import GeoCoordinate, {UNIT}	from 'Core/Geographic/GeoCoordinate';

function FeatureToolBox() {
	this.size       = {x:6378137,y: 6356752.3142451793,z:6378137};
    this.ellipsoid  = new Ellipsoid(this.size);
}

FeatureToolBox.prototype.GeoJSON2Polygon = function(features) {
    var polyGroup = new THREE.Object3D();
    for (var r = 0; r < features.length; r++) {
        var positions = [];
        var polygon = features[r].geometry.coordinates[0][0];
        var altitude = features[r].properties.z_min;
        if (polygon.length > 2 && altitude != 9999) {
            for (var j = 0; j < polygon.length; ++j) {
                var pt2DTab = polygon[j]; //.split(' ');
                //long et puis lat
                var geoCoord = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), altitude, UNIT.DEGREE)
                var spt = this.tool.ellipsoid.cartographicToCartesian(geoCoord);
                positions.push( spt.x, spt.y, spt.z);
            }
            var geometry = new THREE.BufferGeometry();
            var material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent : true, opacity: 0.9}); //side:THREE.DoubleSide, , linewidth: 5,
            geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
            geometry.computeBoundingSphere();
            var poly = new THREE.Line( geometry, material );
            poly.frustumCulled = false;
            polyGroup.add(poly);
        }
    }

    return polyGroup;
};

FeatureToolBox.prototype.GeoJSON2Box = function(features) {
    var bboxGroup = new THREE.Object3D();
    var wallGeometry = new THREE.Geometry(); // for the walls
    var roofGeometry = new THREE.Geometry(); // for the roof
    var suppHeight = 10; // So we don't cut the roof

    for (var r = 0; r < features.length; r++) {
        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var altitude = features[r].properties.z_min;
        var polygon = features[r].geometry.coordinates[0][0];
        var goodAltitude;

        if (polygon.length > 2) {

            if(altitude != 9999) goodAltitude = altitude;

            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {
                var pt2DTab = polygon[j]; //.split(' ');

                var geoCoord1 = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude, UNIT.DEGREE);
                var geoCoord2 = new GeoCoordinate(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0]), goodAltitude + hauteur, UNIT.DEGREE);
                var pgeo1 = this.ellipsoid.cartographicToCartesian(geoCoord1);
                var pgeo2 = this.ellipsoid.cartographicToCartesian(geoCoord2);

                var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z);
                var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                arrPoint2D.push(CVML.newPoint(parseFloat(pt2DTab[1]), parseFloat(pt2DTab[0])));

                wallGeometry.vertices.push(vector3_1, vector3_2);

            }

            // FACES
            // indice of the first point of the polygon 3D
            for (var k = wallGeometry.vertices.length - ((polygon.length - 1) * 2); k < wallGeometry.vertices.length; k = k + 2) {

                var l = k; // % (pts2DTab.length);
                if (l > wallGeometry.vertices.length - 4) {
                    l = wallGeometry.vertices.length - ((polygon.length - 1) * 2);
                }
                wallGeometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                wallGeometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
            }

            var ll = wallGeometry.vertices.length - ((polygon.length - 1) * 2);
            wallGeometry.faces.push(new THREE.Face3(ll, ll + 1, wallGeometry.vertices.length - 1));
            wallGeometry.faces.push(new THREE.Face3(ll, wallGeometry.vertices.length - 1, wallGeometry.vertices.length - 2));
        }

        wallGeometry.computeFaceNormals(); // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH

        //**************** ROOF ****************************

        var triangles = CVML.TriangulatePoly(arrPoint2D);
        triangles.forEach(function(t) {

            var pt1 = t.getPoint(0),
                pt2 = t.getPoint(1),
                pt3 = t.getPoint(2);

            var geoCoord1 = new GeoCoordinate(pt1.x, pt1.y, goodAltitude + hauteur, UNIT.DEGREE);
            var geoCoord2 = new GeoCoordinate(pt2.x, pt2.y, goodAltitude + hauteur, UNIT.DEGREE);
            var geoCoord3 = new GeoCoordinate(pt3.x, pt3.y, goodAltitude + hauteur, UNIT.DEGREE);

            var pgeo1 = this.ellipsoid.cartographicToCartesian(geoCoord1); //{longitude:p1.z, latitude:p1.x, altitude: 0});
            var pgeo2 = this.ellipsoid.cartographicToCartesian(geoCoord2);
            var pgeo3 = this.ellipsoid.cartographicToCartesian(geoCoord3);

            roofGeometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
            roofGeometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

            var face = new THREE.Face3(
                roofGeometry.vertices.length - 3,
                roofGeometry.vertices.length - 2,
                roofGeometry.vertices.length - 1
            );
            roofGeometry.faces.push(face);

        }.bind(this));

    }

    roofGeometry.computeFaceNormals();

    var wallMat = new THREE.MeshBasicMaterial({color: 0xcccccc, transparent: true, opacity: 0.8, side : THREE.DoubleSide});  // map : texture,
    var roofMat = new THREE.MeshBasicMaterial({color: 0x660000, transparent: true, opacity: 0.8, side : THREE.DoubleSide});

    var wall  = new THREE.Mesh(wallGeometry, wallMat);
        wall.frustumCulled = false;
    var roof  = new THREE.Mesh(roofGeometry, roofMat);
        roof.frustumCulled = false;

    bboxGroup.add(wall);
    bboxGroup.add(roof);

    return bboxGroup;
};

/**
 * Permit to cut a line at the end of the tile.
 * @param coords: the coords which are tested
 * @param slope: the slope of the current portion of line
 * @param rest:
 * @param bbox; the tile bounding box
 */
FeatureToolBox.prototype.cutLine = function(coords, slope, rest, bbox) {
    var minLong = bbox.west(), maxLong = bbox.east(), minLat  = bbox.south(), maxLat  = bbox.north();
    if(coords[0] < minLong){
        coords[0] = minLong;
        if(coords[1] >= minLat && coords[1] <= maxLat)
            coords[1] = slope * coords[0] + rest;
    }
    else if (coords[0] > maxLong){
        coords[0] = maxLong;
        if(coords[1] >= minLat && coords[1] <= maxLat)
            coords[1] = slope * coords[0] + rest;
    }
    if(coords[1] < minLat){
        coords[1] = minLat;
        if(coords[0] >= minLong && coords[0] <= maxLong)
            coords[0] = (coords[1] - rest) / slope;
    }
    else if (coords[1] > maxLat){
        coords[1] = maxLat;
        if(coords[0] >= minLong && coords[0] <= maxLong)
            coords[0] = (coords[1] - rest) / slope;
    }
};

/**
 * From a single point, the direction of the line and the orientation of the tile
 * compute the two points which will be on the border of the line.
 * @param pt1: one point of the line
 * @param pt2: another point of the line
 * @param isFirstPt: permit to choose to which point we will compute the border points
 * @param offsetValue: Half value of the line size
 */
FeatureToolBox.prototype.computeLineBorderPoints = function(pt1, pt2, isFirstPt, offsetValue) {
    var geoCoord1 = new GeoCoordinate(pt1.x, pt1.y, pt1.z, UNIT.DEGREE);
    var geoCoord2 = new GeoCoordinate(pt2.x, pt2.y, pt2.z, UNIT.DEGREE);

    var cart1 = this.ellipsoid.cartographicToCartesian(geoCoord1);
    var cart2 = this.ellipsoid.cartographicToCartesian(geoCoord2);

    var dx      = cart2.x - cart1.x;
    var dy      = cart2.y - cart1.y;
    var dz      = cart2.z - cart1.z;

    var direct  = new THREE.Vector3(dx, dy, dz);
    direct.normalize();
    var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord1);
    normalGlobe.normalize();

    normalGlobe.cross(direct);
    normalGlobe.normalize();

    //Compute offset to find the left and right point with the given offset value
    var offsetX = normalGlobe.x * offsetValue;
    var offsetY = normalGlobe.y * offsetValue;
    var offsetZ = normalGlobe.z * offsetValue;

    //The first point left and point right of the line
    var left, right;
    if(isFirstPt){
        left    = new THREE.Vector3(cart1.x - offsetX, cart1.y - offsetY, cart1.z - offsetZ);
        right   = new THREE.Vector3(cart1.x + offsetX, cart1.y + offsetY, cart1.z + offsetZ);
    } else {
        left    = new THREE.Vector3(cart2.x - offsetX, cart2.y - offsetY, cart2.z - offsetZ);
        right   = new THREE.Vector3(cart2.x + offsetX, cart2.y + offsetY, cart2.z + offsetZ);
    }
    return {left: left, right: right};
};

/**
 * Process the data received from a WFS request with a tile of feature type 'Line'.
 * Can be used whe the type of the feature tile is a Grid and not a quadTree
 * @param features: the data received as JSON inside a tab
 * @param box: 		the tile bounding box (rad)
 * @param layer: 	the current layer with specific parameters
 */
FeatureToolBox.prototype.GeoJSON2Line = function(features, box, layer) {
    var bbox = new BoundingBox( box.west()  * 180.0 / Math.PI,
								box.east()  * 180.0 / Math.PI,
								box.south() * 180.0 / Math.PI,
								box.north() * 180.0 / Math.PI,
								box.bottom(), box.top());
    var minLong  = bbox.west(), maxLong = bbox.east(), minLat  = bbox.south(),  maxLat  = bbox.north();
    var geometry = new THREE.Geometry();

    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords  = feature.geometry.coordinates;

        var j = 0;
        var inTile = false;

        //Cut the line according to the tiles limits
        //May not be usefull if we can cut the line before inside the request to the WFS provider
        do{
            var c_1 = coords[j - 1], c = coords[j], cX = c[0], cY = c[1], c1  = coords[j + 1];
            if(c_1 != undefined) var c_1X = c_1[0], c_1Y = c_1[1];
            if(c1 != undefined)  var c1X  = c1[0],  c1Y  = c1[1];

            if (cX < minLong || cX > maxLong || cY < minLat || cY > maxLat) {
                if(inTile) {
                    let coeffSlope = (cY - c_1Y) / (cX - c_1X);
                    let rest = cY - coeffSlope * cX;

                    this.cutLine(c, coeffSlope, rest, bbox);
                    j++;
                } else if (c1 != undefined && c1X > minLong && c1X < maxLong &&  c1Y > minLat  && c1Y < maxLat) {
                    let coeffSlope = (c1Y - cY) / (c1X - cX);
                    let rest = c1Y - coeffSlope * c1X;

                    this.cutLine(c, coeffSlope, rest, bbox);
                    j++;
                } else
                    coords.splice(j, 1);
                inTile = false;
            } else {
                inTile = true;
                j++;
            }
        }while (j < coords.length);

        if(coords.length > 1){
            var resp = this.computeLineBorderPoints(new THREE.Vector3(coords[0][0], coords[0][1], 180),
                                                    new THREE.Vector3(coords[1][0], coords[1][1], 180),
                                                    true, layer.params.length || 10);

            for (j = 0; j < coords.length - 1; j++) {
                var currentGeometry = new THREE.Geometry();
                currentGeometry.vertices.push(resp.left, resp.right);

                resp = this.computeLineBorderPoints(new THREE.Vector3(coords[j][0],     coords[j][1], 180),
                                                    new THREE.Vector3(coords[j + 1][0], coords[j + 1][1], 180),
                                                    false, layer.params.length || 10);

                currentGeometry.vertices.push(resp.left, resp.right);

                currentGeometry.faces.push( new THREE.Face3(0, 2, 1),
                                            new THREE.Face3(2, 3, 1));

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                for (var k = 0; k < currentGeometry.faces.length; k++)
                    this.manageColor(feature.properties, currentGeometry.faces[k].color, layer);

                geometry.merge(currentGeometry);
            }
        }
    }
    return geometry;
};

/**
 * Create the entire geometry of the object passed in. Is use to create feature geometry
 * like points or boxes.
 * @param features: the data received as JSON inside a tab
 * @param bbox:  	the tile bounding box (rad)
 * @param type:  	the type of mesh for this layer
 * @param layer: 	the current layer with specific parameters
 * @param node: 	the current node
 */
FeatureToolBox.prototype.GeoJSON2Point = function(features, bbox, layer) {
    var geometry = new THREE.Geometry();
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var coords = feature.geometry.coordinates;

        var geoCoord = new GeoCoordinate(coords[0], coords[1], ((bbox.bottom() + bbox.top()) / 2) + 3, UNIT.DEGREE);
        var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(geoCoord);
        var centerPoint = this.ellipsoid.cartographicToCartesian(geoCoord);

        var currentGeometry;
        var params = layer.params;
        if(layer.type == 'box')
            currentGeometry = new THREE.BoxGeometry(params.boxWidth || 40, params.boxWidth || 40, params.boxHeight || 80);
        else if(layer.type == 'point')
            currentGeometry = new THREE.CircleGeometry(params.radius || 10, params.nbSegment || 3, params.thetaStart || 0, params.thetaLength || 2 * Math.PI);
        else
            continue;

        currentGeometry.lookAt(normalGlobe);
        currentGeometry.translate(centerPoint.x, centerPoint.y, centerPoint.z);

        for (var j = 0; j < currentGeometry.faces.length; j++)
            this.manageColor(feature.properties, currentGeometry.faces[j].color, layer);

        geometry.merge(currentGeometry);
    }
    return geometry;
};

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color: 	  manager of the color of a face
 * @params layer: 	  the current layer with specific parameters
 */
FeatureToolBox.prototype.manageColor = function(properties, color, layer) {
    var colorParams = layer.params.color || undefined;

    if(colorParams !== undefined)
        for (var i = 0; i < colorParams.testTab.length; i++) {
            if(properties[colorParams.property] === colorParams.testTab[i]){
                color.setHex(colorParams.colorTab[i]);
                return;
            }
        }
    color.setHex(new THREE.Color(0xFFFFFF));
};

export default FeatureToolBox;
