/**
 * Generated On: 2015-10-5
 * Class: GeoCoordinate
 * Description: Coordonnées cartographiques
 */
/**
 *
 * @param {type} defaultValue
 * @returns {CoordCarto_L9.GeoCoordinate}
 */
import defaultValue from 'Core/defaultValue';
import mE from 'Core/Math/MathExtented';

export const COORD = {
	LONG:0,
	LAT:1,
	ALT:2
};

export const UNIT = {
	RADIAN:0,
	DEGREE:1,
	METER:2
};

var getCoordinateValue = function(unit,coord,id)
{
	unit = defaultValue(unit,UNIT.RADIAN);

	if(unit === UNIT.RADIAN)

		return coord[id];

	else if (unit === UNIT.DEGREE)

		return mE.radToDeg(coord[id]);

};

var setCoordinateValue = function(unit,coord,id,value)
{
	unit = defaultValue(unit,UNIT.RADIAN);

	if(unit === UNIT.RADIAN)

		return coord[id] = value;

	else if (unit === UNIT.DEGREE)

		return coord[id] = mE.degToRad(value);

};

var setCoordinate = function(coordinate,longitude, latitude, altitude,unit) {

	unit = defaultValue(unit,UNIT.RADIAN);

	setCoordinateValue(unit,coordinate,COORD.LONG,longitude);
	setCoordinateValue(unit,coordinate,COORD.LAT,latitude);

	coordinate[COORD.ALT] = altitude;

};

function GeoCoordinate(longitude, latitude, altitude,unit) {

	this.coordinate = new Float64Array(3);

	setCoordinate(this.coordinate,longitude, latitude, altitude,unit);

}

GeoCoordinate.prototype.constructor = GeoCoordinate;

GeoCoordinate.prototype.longitude = function(unit) {

	return getCoordinateValue(unit,this.coordinate,COORD.LONG);
};

GeoCoordinate.prototype.setLongitude = function(longitude,unit) {

	setCoordinateValue(unit,this.coordinate,COORD.LONG,longitude);
};

GeoCoordinate.prototype.latitude = function(unit) {

	return getCoordinateValue(unit,this.coordinate,COORD.LAT);
};

GeoCoordinate.prototype.setLatitude = function(latitude,unit) {

	setCoordinateValue(unit,this.coordinate,COORD.LAT,latitude);

};

GeoCoordinate.prototype.altitude = function() {

	return this.coordinate[COORD.ALT];
};

GeoCoordinate.prototype.setAltitude = function(altitude) {

	this.coordinate[COORD.ALT] = altitude;
};


GeoCoordinate.prototype.set = function(longitude, latitude, altitude,unit) {

	setCoordinate(this.coordinate,longitude, latitude, altitude,unit);

	return this;

};

GeoCoordinate.prototype.copy = function(coordinate,unit) {

	if(coordinate instanceof GeoCoordinate)
		return this.set(coordinate.longitude(),coordinate.latitude(),coordinate.altitude(),unit);
	else
		return this.set(coordinate.longitude,coordinate.latitude,coordinate.altitude,unit);

};

GeoCoordinate.prototype.clone = function() {

	return new GeoCoordinate().copy(this);

};

export default GeoCoordinate;
