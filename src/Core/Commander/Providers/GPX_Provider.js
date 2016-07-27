/**
 * Generated On: 2016-07-07
 * Class: GPX_Provider
 * Description: Parse GPX file to get [lat, lon, alt]
 */

define('Core/Commander/Providers/GPX_Provider', [
        'Core/Commander/Providers/Provider',
        'Core/Commander/Providers/IoDriverXML',
        'THREE',
        'Core/Geographic/CoordCarto',
        'Core/Commander/Providers/ItownsLine'
    ],
    function(
        Provider,
        IoDriverXML,
        THREE,
        CoordCarto,
        ItownsLine
    ) {

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

                // ------------------------------------
                // Getting the waypoint points
                // ------------------------------------
                var wpt = result.getElementsByTagName("wpt");
                var geometry_p = new THREE.Geometry();

                for (var i = 0; i < wpt.length; i++)
                    geometry_p.vertices.push(this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(Number(wpt[i].attributes.lon.nodeValue),Number(wpt[i].attributes.lat.nodeValue),Number(wpt[i].getElementsByTagName("ele")[0].childNodes[0].nodeValue))));

                var material_p = new THREE.PointsMaterial( {color: 0x00ff00, size: 100, sizeAttenuation : true} );

                var points = new THREE.Points( geometry_p, material_p );

                // ------------------------------------
                //Getting the track points
                // ------------------------------------
                var trkpt = result.getElementsByTagName("trkpt");

                var group = new THREE.Object3D();
                
                var color    = new THREE.Color("rgb(255, 0, 0)");
                
                var imageURL = "data/strokes/hway.png";
                
                var line = new ItownsLine({
                                            time :  1.0,
                                            linewidth   : 500.0,
                                            texture :   imageURL,
                                            useTexture : true,
                                            opacity    : 1.0 ,
                                            sizeAttenuation : 1.0,
                                            color : [color.r, color.g, color.b]
                });

                for (var k = 0; k < trkpt.length ; k++) {
                    var pt = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(Number(trkpt[k].attributes.lon.nodeValue),Number(trkpt[k].attributes.lat.nodeValue),Number(trkpt[k].getElementsByTagName("ele")[0].childNodes[0].nodeValue)));
                    line.addPoint(pt);
                }
                line.process();
                group.add(points);
                group.add(line);
                return group;
            }.bind(this));

        };

        return GPX_Provider;

    });

