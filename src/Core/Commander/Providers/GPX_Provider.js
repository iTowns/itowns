/**
 * Generated On: 2016-07-07

 * Class: Gpx_Provider
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import THREE from 'THREE';
import Provider from 'Core/Commander/Providers/Provider';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import CoordCarto from 'Core/Geographic/CoordCarto';
import ItownsLine from 'Core/Commander/Providers/ItownsLine';
import ItownsPoint from 'Core/Commander/Providers/ItownsPoint';

function Gpx_Provider(ellipsoid) {
    //Constructor
    this.ellipsoid = ellipsoid;
    this.ioDriverXML = new IoDriverXML();
}

Gpx_Provider.prototype = Object.create(Provider.prototype);

Gpx_Provider.prototype.constructor = Gpx_Provider;

Gpx_Provider.prototype.loadGpx = function(urlFile)
{
    return this.ioDriverXML.read(urlFile).then(function(gpxXML){

        return this.GpxToMesh(gpxXML);

    }.bind(this));
};

Gpx_Provider.prototype.GpxToWayPointsArray = function(gpxXML)
{
    return gpxXML.getElementsByTagName("wpt");
};

Gpx_Provider.prototype.GpxToWTrackPointsArray = function(gpxXML)
{
    return gpxXML.getElementsByTagName("trkpt");
};

Gpx_Provider.prototype.GpxToWayPointsMesh = function(gpxXML)
{
    var wayPts = this.GpxToWayPointsArray(gpxXML);

    if(wayPts.length){

        var colorPoint = new THREE.Color("rgb(0, 255, 0)");
        var points = new ItownsPoint({
                time : 1.0,
                useTexture : false,
                texture : "data/strokes/pstar1.png",
                color   : [colorPoint.r, colorPoint.g, colorPoint.b],
                opacity : 1.0
        });

        for (var i = 0; i < wayPts.length; i++)
            points.addPoint(this.GpxPtToCartesian(wayPts[i]),colorPoint,600.0);

        points.process();

        return points;
    }

};

Gpx_Provider.prototype.GpxToWTrackPointsMesh = function(gpxXML)
{

    var trackPts = this.GpxToWTrackPointsArray(gpxXML);

    if(trackPts.length){

        var colorLine = new THREE.Color("rgb(255, 0, 0)");

        var line = new ItownsLine({
                                    time :  1.0,
                                    linewidth   : 100.0,
                                    texture :   "data/strokes/hway1.png",
                                    useTexture : false,
                                    opacity    : 1.0 ,
                                    sizeAttenuation : 1.0,
                                    color : [colorLine.r, colorLine.g, colorLine.b]
        });

        for (var k = 0; k < trackPts.length ; k++){

            line.addPoint(this.GpxPtToCartesian(trackPts[k]));
        }

        line.process();

        return line;

    }

};

Gpx_Provider.prototype.GpxPtToCartesian = function()
{
    var coordCarto = new CoordCarto();

    var longitude,latitude,elevation;

    return function(pt){

        longitude = Number(pt.attributes.lon.nodeValue);
        latitude = Number(pt.attributes.lat.nodeValue);
        elevation = Number(pt.getElementsByTagName("ele")[0].childNodes[0].nodeValue);

        return this.ellipsoid.cartographicToCartesian(coordCarto.setFromDegreeGeo(longitude,latitude,elevation));
    };

}();

Gpx_Provider.prototype.GpxToMesh = function(gpxXML) {

    if (gpxXML === undefined)
        return undefined;

    var gpxMesh = new THREE.Object3D();

    // ------------------------------------
    //Getting the track points
    // ------------------------------------

    var trackPts = this.GpxToWTrackPointsMesh(gpxXML);

    if(trackPts)
        gpxMesh.add(trackPts);

    // ------------------------------------
    // Getting the waypoint points
    // ------------------------------------

    var wayPts = this.GpxToWayPointsMesh(gpxXML);

    if(wayPts)
        gpxMesh.add(wayPts);

    return gpxMesh;

};

export default Gpx_Provider;



