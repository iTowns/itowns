/**
 * Generated On: 2016-07-07
 * Class: GPX_Provider
 * Description: Parse GPX file to get [lat, lon, alt]
 */

import THREE from 'THREE';
import Provider from 'Core/Commander/Providers/Provider';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import CoordCarto from 'Core/Geographic/CoordCarto';
import ItownsLine from 'Core/Commander/Providers/ItownsLine';
import ItownsPoint from 'Core/Commander/Providers/ItownsPoint';

function GPX_Provider(ellipsoid) {
    //Constructor
    this.ellipsoid = ellipsoid;
    this.ioDriverGPX = new IoDriverXML();
}

GPX_Provider.prototype = Object.create(Provider.prototype);

GPX_Provider.prototype.constructor = GPX_Provider;

GPX_Provider.prototype.parseGPX = function(urlFile) {

    return this.ioDriverGPX.read(urlFile).then(function(result) {

        if (result === undefined)
            return undefined;

        var group_gpx = new THREE.Object3D();
        // ------------------------------------
        // Getting the waypoint points
        // ------------------------------------
        var wpt = result.getElementsByTagName("wpt");

        var colorPoint = new THREE.Color("rgb(0, 255, 0)");
        var colorLine = new THREE.Color("rgb(255, 0, 0)");

        var points = new ItownsPoint({
                time : 1.0,
                useTexture : false,
                texture : "data/strokes/pstar1.png",
                color   : [colorPoint.r, colorPoint.g, colorPoint.b],
                opacity : 1.0
        });

        var pt;

        for (var i = 0; i < wpt.length; i++) {

            pt = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(Number(wpt[i].attributes.lon.nodeValue),Number(wpt[i].attributes.lat.nodeValue),Number(wpt[i].getElementsByTagName("ele")[0].childNodes[0].nodeValue)));
            points.addPoint(pt,colorPoint,1000.0);

        }

        points.process();
        group_gpx.add(points);

        // ------------------------------------
        //Getting the track points
        // ------------------------------------
        var trkpt = result.getElementsByTagName("trkpt");

        var line = new ItownsLine({
                                    time :  1.0,
                                    linewidth   : 100.0,
                                    texture :   "data/strokes/hway1.png",
                                    useTexture : false,
                                    opacity    : 1.0 ,
                                    sizeAttenuation : 1.0,
                                    color : [colorLine.r, colorLine.g, colorLine.b]
        });

        for (var k = 0; k < trkpt.length ; k++) {
            pt = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(Number(trkpt[k].attributes.lon.nodeValue),Number(trkpt[k].attributes.lat.nodeValue),Number(trkpt[k].getElementsByTagName("ele")[0].childNodes[0].nodeValue)));
            line.addPoint(pt);
        }
        line.process();
        group_gpx.add(line);
        return group_gpx;
    }.bind(this));

};

export default GPX_Provider;


