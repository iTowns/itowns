/**
 * Generated On: 2016-07-07
 * Class: GPX_Provider
 * Description: Parse GPX file to get [lat, lon, alt]
 */

define('Core/Commander/Providers/GPX_Provider', [
        'Core/Commander/Providers/Provider',
        'Core/Commander/Providers/IoDriverXML',
        'THREE',
        'Core/Geographic/CoordCarto'
    ],
    function(
        Provider,
        IoDriverXML,
        THREE,
        CoordCarto
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

                var material_p = new THREE.PointsMaterial( {color: 0x00ff00, size: 50, sizeAttenuation : true} );

                var point = new THREE.Points( geometry_p, material_p );

                // ------------------------------------
                //Getting the track points
                // ------------------------------------
                var trkpt = result.getElementsByTagName("trkpt");
                var geometry = new THREE.Geometry();

                for (var j = 0; j < trkpt.length; j++)
                    geometry.vertices.push(this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(Number(trkpt[j].attributes.lon.nodeValue),Number(trkpt[j].attributes.lat.nodeValue),Number(trkpt[j].getElementsByTagName("ele")[0].childNodes[0].nodeValue))));

                var material = new THREE.LineBasicMaterial({
                        color: 0xff0000, opacity: 1, linewidth: 5
                    });


                var line = new THREE.Line(geometry, material);
                line.add(point);

                return line;
            }.bind(this));

        };

        return GPX_Provider;

    });

