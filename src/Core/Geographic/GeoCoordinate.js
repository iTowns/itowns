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
    LONG: 0,
    LAT: 1,
    ALT: 2,
};

export const UNIT = {
    RADIAN: 0,
    DEGREE: 1,
    METER: 2,
};

var getCoordinateValue = function getCoordinateValue(unit, coord, id)
{
    unit = defaultValue(unit, UNIT.RADIAN);

    if (unit === UNIT.RADIAN) {
        return coord[id];
    } else if (unit === UNIT.DEGREE) {
        return mE.radToDeg(coord[id]);
    }
};

var setCoordinateValue = function setCoordinateValue(unit, coord, id, value)
{
    unit = defaultValue(unit, UNIT.RADIAN);

    if (unit === UNIT.RADIAN) {
        coord[id] = value;
    } else if (unit === UNIT.DEGREE) {
        coord[id] = mE.degToRad(value);
    }
    return coord[id];
};

var setCoordinate = function setCoordinate(coordinate, longitude, latitude, altitude, unit) {
    unit = defaultValue(unit, UNIT.RADIAN);

    setCoordinateValue(unit, coordinate, COORD.LONG, longitude);
    setCoordinateValue(unit, coordinate, COORD.LAT, latitude);

    coordinate[COORD.ALT] = altitude;
};

function GeoCoordinate(longitude, latitude, altitude, unit) {
    this.coordinate = new Float64Array(3);

    setCoordinate(this.coordinate, longitude, latitude, altitude, unit);
}

GeoCoordinate.prototype.constructor = GeoCoordinate;

GeoCoordinate.prototype.longitude = function longitude(unit) {
    return getCoordinateValue(unit, this.coordinate, COORD.LONG);
};

GeoCoordinate.prototype.setLongitude = function setLongitude(longitude, unit) {
    setCoordinateValue(unit, this.coordinate, COORD.LONG, longitude);
};

GeoCoordinate.prototype.latitude = function latitude(unit) {
    return getCoordinateValue(unit, this.coordinate, COORD.LAT);
};

GeoCoordinate.prototype.setLatitude = function setLatitude(latitude, unit) {
    setCoordinateValue(unit, this.coordinate, COORD.LAT, latitude);
};

GeoCoordinate.prototype.altitude = function altitude() {
    return this.coordinate[COORD.ALT];
};

GeoCoordinate.prototype.setAltitude = function setAltitude(altitude) {
    this.coordinate[COORD.ALT] = altitude;
};


GeoCoordinate.prototype.set = function set(longitude, latitude, altitude, unit) {
    setCoordinate(this.coordinate, longitude, latitude, altitude, unit);

    return this;
};

GeoCoordinate.prototype.copy = function copyCoordinate(coordinate, unit) {
    if (coordinate instanceof GeoCoordinate) {
        return this.set(coordinate.longitude(), coordinate.latitude(), coordinate.altitude(), unit);
    } else {
        return this.set(coordinate.longitude, coordinate.latitude, coordinate.altitude, unit);
    }
};

GeoCoordinate.prototype.clone = function cloneCoordinate() {
    return new GeoCoordinate().copy(this);
};

export default GeoCoordinate;
