/**
 * Generated On: 2016-05-27
 * Class: FeatureProvider
 * Description: Récupère les datas et les transforment en tuile/layer à poser au dessus du terrain.
 */

import WFS_Provider from 'Core/Commander/Providers/WFS_Provider';
import proj4 from 'proj4';
import BoundingBox from 'Scene/BoundingBox';
import THREE from 'THREE';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';
import Projection from 'Core/Geographic/Projection';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';

function FeatureProvider(params) {

	this.WFS_Provider = new WFS_Provider({url: 		params.url,
                                          typename: params.typename,
                                          epsgCode: params.epsgCode,
                                          format: 	params.format});
	this.tileParams = params.tileParams;

	var obj 			= this.tileParams.point !== undefined ? this.tileParams.point :
							(this.tileParams.line !== undefined ? this.tileParams.line :
							(this.tileParams.polygon !== undefined ? this.tileParams.polygon : undefined));
	this.radius 		= (obj !== undefined && obj.radius 	  	!== undefined) ? obj.radius 	 : 40;
	this.nbSegment 		= (obj !== undefined && obj.nbSegment   !== undefined) ? obj.nbSegment   : 3;
	this.thetaStart 	= (obj !== undefined && obj.thetaStart  !== undefined) ? obj.thetaStart  : 0;
	this.thetaLength 	= (obj !== undefined && obj.thetaLength !== undefined) ? obj.thetaLength : 2 * Math.PI;
	this.offsetValue 	= (obj !== undefined && obj.length 		!== undefined) ? obj.length 	 : 0.001;

	this.size = {x:6378137,y: 6356752.3142451793,z:6378137};
	this.ellipsoid = new Ellipsoid(this.size);
}

FeatureProvider.prototype.constructor = FeatureProvider;

/**
 * Send the command and process the answer.
 * @param command : Usefull data to make the request
 */
FeatureProvider.prototype.executeCommand = function (command) {

	var paramsFunction = command.paramsFunction;
	var parent = command.requester;

	var params = {bbox: paramsFunction.bbox, level: parent.level + 1, segment:16, center:null, projected:null};
	var projection = new Projection();
    var builder = new BuilderEllipsoidTile(this.ellipsoid, projection);

    var tile = new command.type(params, builder);

	if(paramsFunction.bbox !== null){
		var bbox = paramsFunction.bbox;

		proj4.defs('EPSG:4326', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

		var minCoord = proj4('EPSG:4326').inverse([(bbox.minCarto.longitude * 180 / Math.PI), (bbox.minCarto.latitude * 180 / Math.PI)]);
		var maxCoord = proj4('EPSG:4326').inverse([(bbox.maxCarto.longitude * 180 / Math.PI), (bbox.maxCarto.latitude * 180 / Math.PI)]);

		var projBbox = new BoundingBox(minCoord[0], maxCoord[0], minCoord[1], maxCoord[1]);

		promise.then(function(value) {
			if(value !== 0 && value !== undefined){
				var geometry = new THREE.Geometry();
				if(this.tileParams.line !== undefined)
					this.processLine(value, geometry, projBbox);
				else if (this.tileParams.point !== undefined)
					this.processPoint(value, geometry);
				tile.setGeometry(geometry);
				tile.geometry.computeBoundingSphere();
				parent.add(tile);
			}
		}.bind(this));
		return promise;
	}
}

FeatureProvider.prototype.cutLine = function(coords, slope, rest, bbox) {

	if(coords[0] < bbox.minCarto.longitude){
		coords[0] = bbox.minCarto.longitude;
		if(coords[1] >= bbox.minCarto.latitude && coords[1] <= bbox.maxCarto.latitude)
			coords[1] = slope * coords[0] + rest;
	}
	else if (coords[0] > bbox.maxCarto.longitude){
		coords[0] = bbox.maxCarto.longitude;
		if(coords[1] >= bbox.minCarto.latitude && coords[1] <= bbox.maxCarto.latitude)
			coords[1] = slope * coords[0] + rest;
	}
	if(coords[1] < bbox.minCarto.latitude){
		coords[1] = bbox.minCarto.latitude;
		if(coords[0] >= bbox.minCarto.longitude && coords[0] <= bbox.maxCarto.longitude)
			coords[0] = (coords[1] - rest) / slope;
	}
	else if (coords[1] > bbox.maxCarto.latitude){
		coords[1] = bbox.maxCarto.latitude;
		if(coords[0] >= bbox.minCarto.longitude && coords[0] <= bbox.maxCarto.longitude)
			coords[0] = (coords[1] - rest) / slope;
	}
}

FeatureProvider.prototype.computeLineBorderPoints = function(pt1, pt2, isFirstPt) {

	var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.x, pt1.y, pt1.z);
	var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.x, pt2.y, pt2.z);

	var cart1 = this.ellipsoid.cartographicToCartesian(coordCarto1);
	var cart2 = this.ellipsoid.cartographicToCartesian(coordCarto2);

	var dx 		= cart2.x - cart1.x;
	var dy 		= cart2.y - cart1.y;
	var dz		= cart2.z - cart1.z;

	var direct 	= new THREE.Vector3(dx, dy, dz);
	direct.normalize();
	var normalGlobe = this.ellipsoid.geodeticSurfaceNormalCartographic(coordCarto1);
	normalGlobe.normalize();

	normalGlobe.cross(direct);
	normalGlobe.normalize();

	//Compute offset to find the left and right point with the given offset value
	var offsetX = normalGlobe.x * this.offsetValue;
	var offsetY = normalGlobe.y * this.offsetValue;
	var offsetZ = normalGlobe.z * this.offsetValue;
	//console.log(offsetZ);

	//The first point left and point right of the line
	var left, right;
	if(isFirstPt){
		left 	= new THREE.Vector3(cart1.x - offsetX, cart1.y - offsetY, cart1.z - offsetZ);
		right 	= new THREE.Vector3(cart1.x + offsetX, cart1.y + offsetY, cart1.z + offsetZ);
	} else {
		left 	= new THREE.Vector3(cart2.x - offsetX, cart2.y - offsetY, cart2.z - offsetZ);
		right 	= new THREE.Vector3(cart2.x + offsetX, cart2.y + offsetY, cart2.z + offsetZ);
	}
	return {left: left, right: right};
}

/**
 * Process the data received from a WFS request with a tile of feature type 'Line'.
 * Can be used whe the type of the feature tile is a Grid and not a quadTree
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
FeatureProvider.prototype.processLine = function(value, geometry, bbox) {

	for (var i = 0; i < value.features.length; i++) {
		var feature 	= value.features[i];
		var coords 		= feature.geometry.coordinates;

		var j = 0;
		var isInsideTile = false;

		//Cut the line according to the tiles limits
		//May not be usefull if we can cut the line before on the request to the WFS provider
		do{
			if(coords[j][0] < bbox.minCarto.longitude || coords[j][0] > bbox.maxCarto.longitude
				|| coords[j][1] < bbox.minCarto.latitude || coords[j][1] > bbox.maxCarto.latitude) {
				var coeffSlope, rest;
				if(isInsideTile) {
					coeffSlope = (coords[j][1] - coords[j - 1][1]) / (coords[j][0] - coords[j - 1][0]);
					rest = coords[j][1] - coeffSlope * coords[j][0];

					this.cutLine(coords[j], coeffSlope, rest, bbox);

					j++;
				} else if (coords[j+1] != undefined
					&& (coords[j + 1][0] > bbox.minCarto.longitude && coords[j + 1][0] < bbox.maxCarto.longitude
					&& coords[j + 1][1] > bbox.minCarto.latitude && coords[j + 1][1] < bbox.maxCarto.latitude)) {

					coeffSlope = (coords[j + 1][1] - coords[j][1]) / (coords[j + 1][0] - coords[j][0]);
					rest = coords[j + 1][1] - coeffSlope * coords[j + 1][0];

					this.cutLine(coords[j], coeffSlope, rest, bbox);

					j = j + 2;
				} else {
					coords.splice(j, 1);
				}
				isInsideTile = false;
			} else {
				isInsideTile = true;
				j++;
			}
		}while (j < coords.length);

		if(coords.length > 1){
			var resp = this.computeLineBorderPoints(new THREE.Vector3(coords[0][0], coords[0][1], 600),
													new THREE.Vector3(coords[1][0], coords[1][1], 600), true);

			for (j = 0; j < coords.length - 1; j++) {
				var currentGeometry = new THREE.Geometry();
				currentGeometry.vertices.push(resp.left, resp.right);

				resp = this.computeLineBorderPoints(new THREE.Vector3(coords[j][0], coords[j][1], 600),
													new THREE.Vector3(coords[j + 1][0], coords[j + 1][1], 600), false);

				currentGeometry.vertices.push(resp.left, resp.right);

				currentGeometry.faces.push(	new THREE.Face3(0, 2, 1),
											new THREE.Face3(2, 3, 1));

				geometry.computeFaceNormals();
				geometry.computeVertexNormals();

				for (var k = 0; k < currentGeometry.faces.length; k++)
					this.manageMaterial(feature.properties, currentGeometry.faces[k].color);

				geometry.merge(currentGeometry);
			}
		}
	}

	return geometry;
}

/**
 * Process the data received from a WFS request with a tile of feature type 'Point'.
 * @param value: the JSON object which contains the data received from the WFS request
 * @param geometry: the geometry used to set the tile geometry
 */
FeatureProvider.prototype.processPoint = function(value, geometry) {

	for (var i = 0; i < value.features.length; i++) {
		var feature = value.features[i];
		var coords 	= feature.geometry.coordinates;

		var currentGeometry = new THREE.CircleGeometry(this.radius, this.nbSegment, this.thetaStart, this.thetaLength);
		var coordCarto = new CoordCarto().setFromDegreeGeo(coords[0], coords[1], 500);
		var centerPoint = this.ellipsoid.cartographicToCartesian(coordCarto);

		var normal = this.ellipsoid.geodeticSurfaceNormalCartographic(coordCarto);
		currentGeometry.lookAt(new THREE.Vector3().addVectors(centerPoint, normal));

		currentGeometry.translate(centerPoint.x, centerPoint.y, centerPoint.z);

		for (var j = 0; j < currentGeometry.faces.length; j++)
			this.manageMaterial(feature.properties, currentGeometry.faces[j].color);

		geometry.merge(currentGeometry);
	}

	return geometry;
}

FeatureProvider.prototype.manageMaterial = function(featureProperties, color) {
	var getType = {};

	if(this.tileParams.point !== undefined){
		if(this.tileParams.point && getType.toString.call(this.tileParams.point) === '[object Function]')
			this.tileParams.point(featureProperties);
		else
			this.manageColor(featureProperties, color, this.tileParams.point);
	} else if (this.tileParams.line !== undefined) {
		if(this.tileParams.line && getType.toString.call(this.tileParams.line) === '[object Function]')
			this.tileParams.line(featureProperties, this.tileParams);
		else
			this.manageColor(featureProperties, color, this.tileParams.line);
	} /*else if (this.tileParams.polygon !== undefined){

	} else {
		console.log('Le type de data n\'est présentement pas le bon');
	}*/
}

/**
 * Manage to put the colors inside the color manager for a feature type 'Point'.
 * @param properties: properties of the feature
 * @param color : manager of the color of a face
 * @params tileParams: the tile to which apply the geometry
 */
FeatureProvider.prototype.manageColor = function(properties, color, tileParams) {

	var colorParams = tileParams.color;

	for (var i = 0; i < colorParams.testTab.length; i++) {
		if(properties[colorParams.property] === colorParams.testTab[i]){
			color.setHex(colorParams.colorTab[i]);
			return;
		}
	}
	color.setHex(new THREE.Color(0xFFFFFF));
}

export default FeatureProvider;
