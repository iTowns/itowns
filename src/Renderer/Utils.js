// var Cartography = require('Cartogaphy');

define([], function() {

    /**
     * Tools used by iTOWNS modules
     * @exports Utils
     * @author Mathieu Benard IGN
     */

    //--------- Ray casting---------------
    var _tp = [];
    _P = function(x, y) {
        this.x = x;
        this.y = y;
        this.flag = false;
    }
    _P.prototype.toString = function() {
        return "Point [" + this.x + ", " + this.y + "]";
    }
    _P.dist = function(a, b) {
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        //--------------------------------------
    var Utils = {


        snd: null, // Sound player (for fun)
        snd2: null, // When mixing another sound
        /**
         * Return the hexadecimal reprensentation of an integer (expressed in base 10)
         */


        toHex: function(number, min) {
            var hexes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
            var hex = '';
            var min = min || 2;
            var nibble;

            do {
                nibble = number & 0x0f;
                number = number >> 4;
                hex = hexes[nibble] + hex;
            } while (number);

            if (hex.length < min) {
                hex = new Array(min - hex.length + 1).join('0') + hex;
            }

            return '0x' + hex;
        },

        /**
         * Get the total offset (top, left) of DOM element, including his parents offset
         *
         * @param {Object} element The DOM element
         * @return : {Object} Object with properties top and left (calculated offset)
         */
        getOffset: function(element) {
            var top = 0,
                left = 0;
            do {
                top += element.offsetTop;
                left += element.offsetLeft;
            } while (element = element.offsetParent);

            return {
                top: top,
                left: left
            };
        },

        rad2Deg: function(rad) {
            return (180 * rad / Math.PI) % 360;
        },

        deg2Rad: function(deg) {
            return (Math.PI * deg / 180) % (2 * Math.PI);
        },

        /**
         * @return {Number} absolute difference between the two given angles wich must be in radian and belong
         * to [0,2π[
         */
        angleDiff: function(angle1, angle2) {
            var dif = angle1 - angle2;

            if (dif < -Math.PI) {
                dif += 2 * Math.PI;
            } else if (dif > Math.PI) {
                dif -= 2 * Math.PI;
            }

            return Math.abs(dif);
        },

        parseParams: function() {
            var params = {};

            var tmp = window.location.search.substr(1).split("&"); // Adresse ex: http://www.itowns.fr/viewer/laserADVIewer.html?date=2008_05_05&hour=14&seconds=350&easting=655550.2&northing=6866565.3
            for (i = 0; i < tmp.length; i++) {
                data = tmp[i].split("=");
                params[data[0].toLowerCase()] = data[1];
            }
            //http://localhost/termob3/?easting=652630.51&northing=6861728.03&mobile=false&nc=false
            params.panoname = params.panoname || "TerMob2-130116_0923-00-00002_0000623";
            params.easting = params.easting || 651110;
            params.northing = params.northing || 6861835;
            params.heading = params.heading || 0;
            params.duree = params.duree || "25";
            params.particlesize = params.particlesize || "0.01";
            params.mobile = params.mobile == "true" || false;
            params.nc = params.nc == "true" || false; // nodecontroller to control camera from phone accelerometer


            if (typeof(params.debug) === "undefined" || params.debug !== "true") {
                params.debug = false;
            } else {
                params.debug = true;
            }

            //dinhnq : to initialize Opendata Modules

            // params.easting = params.easting || "655550.2";
            // params.northing = params.northing || "6866565.3";
            // params.altitude = params.altitude || "0.0";
            return params;
        },

        /**
         * @todo Clean it (global var)
         */
        getInitialInfoAndLoad: function(infoArray) {

            if (typeof(infoArray) === "undefined") {
                var req = new IT.RequestGIS("php/getInfoFromName.php?panoname=" + params.panoname);
                req.sendCommand(IT.Utils.getInitialInfoAndLoad);
            } else {

                var info = {};
                info.easting = infoArray[0].split("=")[1];
                info.northing = infoArray[1].split("=")[1];
                info.altitude = infoArray[2].split("=")[1];
                info.heading = infoArray[3].split("=")[1];
                info.pitch = infoArray[4].split("=")[1];
                info.roll = infoArray[5].split("=")[1];

                var time = infoArray[6].split("=")[1].split(":");
                info.hour = time[0];
                info.second = parseInt(time[1]) * 60 + parseInt(time[2])
                info.near_address_num = infoArray[7].split("=")[1];
                info.near_address_name = infoArray[8].split("=")[1];
                info.date = infoArray[9].split("=")[1].replace(/-/g, "_").trim();

                var currentPanoX = pano.panoInfo.easting;
                var currentPanoY = pano.panoInfo.altitude;
                var currentPanoZ = pano.panoInfo.northing;
                pano.name = params.panoname;
                pano.url = serverInfos.url + serverInfos.iipService + "/" + params.panoname + ".jp2";

                pano.panoInfo.easting = info.easting;
                pano.panoInfo.northing = info.northing;
                pano.panoInfo.altitude = info.altitude;
                pano.panoInfo.pan_xml_heading_pp = info.heading;
                pano.panoInfo.pan_xml_pitch_pp = info.pitch;
                pano.panoInfo.pan_xml_roll_pp = info.roll;
                pano.loadUrl(pano.url);

                console.log(pano.panoInfo.easting - initialInfo['easting']);
                pano.updateGlobalPano(new THREE.Vector3(pano.panoInfo.easting - initialInfo['easting'],
                        pano.panoInfo.altitude - initialInfo['altitude'],
                        pano.panoInfo.northing - initialInfo['northing']),
                    new THREE.Vector3(IT.Utils.deg2Rad(pano.panoInfo.pan_xml_roll_pp),
                        IT.Utils.deg2Rad(pano.panoInfo.pan_xml_heading_pp),
                        IT.Utils.deg2Rad(pano.panoInfo.pan_xml_pitch_pp)));


                var translation = {
                    x: pano.panoInfo.easting - currentPanoX,
                    y: pano.panoInfo.altitude - currentPanoY,
                    z: pano.panoInfo.northing - currentPanoZ
                }

                translatX += translation.x;
                translatY += translation.y;
                translatZ += translation.z;


                camera.position.x = translatX;
                camera.position.y = translatY;
                camera.position.z = translatZ;

                //translating the current position on the map if it has not been done yet
                if (map) {
                    map.movePositionOnMap(translation);
                }

                IT.Utils.cameraLookAtPosition(intersectionX, intersectionY, intersectionZ, camera.position.x, camera.position.y, camera.position.z);
                //this.cameraLookAtPosition(0,0,this.camera.position.x,this.camera.position.z);
                //IT.Utils.getInitialInfoAndLoad

            }
        },

        /**
         * Function that make the cam look at a special 3D (2D) point knowing his future position.
         * x1,z1 target of intersection , x2 z2 position of cam after translation in center of pano.
         * @todo : Clean it (delete global var uses)
         */
        cameraLookAtPosition: function(x1, y1, z1, x2, y2, z2, headingCorrection) {


            var alpha = Math.atan2(x1 - x2, z1 - z2);
            var d = 100000;
            anglecameraLon = alpha;
            var x = -distTarget * Math.sin(anglecameraLon);
            var z = -distTarget * Math.cos(anglecameraLon);

            var base = Math.sqrt((x1 - x2) * (x1 - x2) + (z1 - z2) * (z1 - z2));
            var beta = Math.atan2(y1 - y2, base);
            console.log(beta);
            anglecameraLat = -beta;
            var y = -distTarget * Math.sin(beta);

            camrotxwanted = x;
            camrotywanted = y;
            camrotzwanted = z;
        },

        outputMatrix4: function(mat) {
            console.debug(mat.elements[0] + " " + mat.elements[4] + " " + mat.elements[8] + " " + mat.elements[12] + "\n" +
                mat.elements[1] + " " + mat.elements[5] + " " + mat.elements[9] + " " + mat.elements[13] + "\n" +
                mat.elements[2] + " " + mat.elements[6] + " " + mat.elements[10] + " " + mat.elements[14] + "\n" +
                mat.elements[3] + " " + mat.elements[7] + " " + mat.elements[11] + " " + mat.elements[15]);
        },

        inDivArea: function(x, y, divID) {
            var divMap = $(divID)[0];
            var isInDiv = false;
            var divOffset = Utils.getOffset(divMap);

            if (x >= divOffset.left && x <= (divOffset.left + divMap.offsetWidth) &&
                y >= divOffset.top && y <= (divOffset.top + divMap.offsetHeight)) {
                isInDiv = true;
            }
            return isInDiv;
        },

        clamp: function(val, range) {
            if (val < range.min) {
                val = rangemin;
            }

            if (val > max) {
                val = max;
            }

            return val;
        },

        clampMin: function(val, min) {
            if (val < min) {
                return min;
            } else {
                return val;
            }
        },

        clampMax: function(val, max) {
            if (val > max) {
                return max;
            } else {
                return val;
            }
        },

        /**
         * Convert 2D coordinates from screen space ranging from [0..window.innerWidth] in x and [0..window.innerHeight]
         * in y to Normalized Device Coordinates (NDC) ranging from [-1..1] in x and [-1..1] in y
         * @return {Object} Converted point (x,y)
         */
        toNDC: function(x, y) {
            return {
                x: (x / (window.innerWidth)) * 2 - 1,
                y: -(y / (window.innerHeight)) * 2 + 1
            };
        },

        /**
         * toNDC inverse function (i.e convert from NDC space to screen space)
         * @return {Object} Converted point (x,y)
         * @see toNDC
         */
        toScreenSpace: function(x, y) {
            return {
                x: (x + 1) / 2 * window.innerWidth,
                y: -(y - 1) / 2 * window.innerHeigth
            };
        },

        notYetImplemented: function() {
            throw new Error("Not yet implented !");
        },

        noPanoramic: function() {
            alert("No panoramic found at that position");
        },



        loadTexture: function(path) {

            var texture = new THREE.Texture(texture_placeholder);
            var material = new THREE.MeshBasicMaterial({
                map: texture,
                overdraw: true
            });

            var image = new Image();
            image.onload = function() {

                texture.needsUpdate = true;
                material.map.image = this;

                render();

            };
            image.src = path;

            return material;

        },

        // SAVE Good old THREE matrix functions
        translate: function(matrix, v) {

            var te = matrix.elements;
            var x = v.x,
                y = v.y,
                z = v.z;

            te[12] = te[0] * x + te[4] * y + te[8] * z + te[12];
            te[13] = te[1] * x + te[5] * y + te[9] * z + te[13];
            te[14] = te[2] * x + te[6] * y + te[10] * z + te[14];
            te[15] = te[3] * x + te[7] * y + te[11] * z + te[15];

            return matrix;
        },

        rotateX: function(matrix, angle) {

            var te = matrix.elements;
            var m12 = te[4];
            var m22 = te[5];
            var m32 = te[6];
            var m42 = te[7];
            var m13 = te[8];
            var m23 = te[9];
            var m33 = te[10];
            var m43 = te[11];
            var c = Math.cos(angle);
            var s = Math.sin(angle);

            te[4] = c * m12 + s * m13;
            te[5] = c * m22 + s * m23;
            te[6] = c * m32 + s * m33;
            te[7] = c * m42 + s * m43;

            te[8] = c * m13 - s * m12;
            te[9] = c * m23 - s * m22;
            te[10] = c * m33 - s * m32;
            te[11] = c * m43 - s * m42;

            return matrix;

        },

        rotateY: function(matrix, angle) {

            var te = matrix.elements;
            var m11 = te[0];
            var m21 = te[1];
            var m31 = te[2];
            var m41 = te[3];
            var m13 = te[8];
            var m23 = te[9];
            var m33 = te[10];
            var m43 = te[11];
            var c = Math.cos(angle);
            var s = Math.sin(angle);

            te[0] = c * m11 - s * m13;
            te[1] = c * m21 - s * m23;
            te[2] = c * m31 - s * m33;
            te[3] = c * m41 - s * m43;

            te[8] = c * m13 + s * m11;
            te[9] = c * m23 + s * m21;
            te[10] = c * m33 + s * m31;
            te[11] = c * m43 + s * m41;

            return matrix;
        },

        rotateZ: function(matrix, angle) {

            var te = matrix.elements;
            var m11 = te[0];
            var m21 = te[1];
            var m31 = te[2];
            var m41 = te[3];
            var m12 = te[4];
            var m22 = te[5];
            var m32 = te[6];
            var m42 = te[7];
            var c = Math.cos(angle);
            var s = Math.sin(angle);

            te[0] = c * m11 + s * m12;
            te[1] = c * m21 + s * m22;
            te[2] = c * m31 + s * m32;
            te[3] = c * m41 + s * m42;

            te[4] = c * m12 - s * m11;
            te[5] = c * m22 - s * m21;
            te[6] = c * m32 - s * m31;
            te[7] = c * m42 - s * m41;

            return matrix;
        },

        rotateByAxis: function(matrix, axis, angle) {

            var te = matrix.elements;

            // optimize by checking axis

            if (axis.x === 1 && axis.y === 0 && axis.z === 0) {

                return this.rotateX(matrix, angle);

            } else if (axis.x === 0 && axis.y === 1 && axis.z === 0) {

                return this.rotateY(matrix, angle);

            } else if (axis.x === 0 && axis.y === 0 && axis.z === 1) {

                return this.rotateZ(matrix, angle);

            }

            var x = axis.x,
                y = axis.y,
                z = axis.z;
            var n = Math.sqrt(x * x + y * y + z * z);

            x /= n;
            y /= n;
            z /= n;

            var xx = x * x,
                yy = y * y,
                zz = z * z;
            var c = Math.cos(angle);
            var s = Math.sin(angle);
            var oneMinusCosine = 1 - c;
            var xy = x * y * oneMinusCosine;
            var xz = x * z * oneMinusCosine;
            var yz = y * z * oneMinusCosine;
            var xs = x * s;
            var ys = y * s;
            var zs = z * s;

            var r11 = xx + (1 - xx) * c;
            var r21 = xy + zs;
            var r31 = xz - ys;
            var r12 = xy - zs;
            var r22 = yy + (1 - yy) * c;
            var r32 = yz + xs;
            var r13 = xz + ys;
            var r23 = yz - xs;
            var r33 = zz + (1 - zz) * c;

            var m11 = te[0],
                m21 = te[1],
                m31 = te[2],
                m41 = te[3];
            var m12 = te[4],
                m22 = te[5],
                m32 = te[6],
                m42 = te[7];
            var m13 = te[8],
                m23 = te[9],
                m33 = te[10],
                m43 = te[11];

            te[0] = r11 * m11 + r21 * m12 + r31 * m13;
            te[1] = r11 * m21 + r21 * m22 + r31 * m23;
            te[2] = r11 * m31 + r21 * m32 + r31 * m33;
            te[3] = r11 * m41 + r21 * m42 + r31 * m43;

            te[4] = r12 * m11 + r22 * m12 + r32 * m13;
            te[5] = r12 * m21 + r22 * m22 + r32 * m23;
            te[6] = r12 * m31 + r22 * m32 + r32 * m33;
            te[7] = r12 * m41 + r22 * m42 + r32 * m43;

            te[8] = r13 * m11 + r23 * m12 + r33 * m13;
            te[9] = r13 * m21 + r23 * m22 + r33 * m23;
            te[10] = r13 * m31 + r23 * m32 + r33 * m33;
            te[11] = r13 * m41 + r23 * m42 + r33 * m43;

            return matrix;

        },
        //dinhnq-- invers matrix, need for opendata module
        /*
         * The inverse of a 2x2 matrix:
            | a11 a12 |-1             |  a22 -a12 |
            | a21 a22 |    =  1/DET * | -a21  a11 |
            with DET  =  a11a22-a12a21
         */
        invMatrix2x2: function(a, b, c, d) {
            //A = [a,b;c,d] => inv(A) = (1/detA)[d,-b;-c,a]
            var ret = new Array(4);
            var detA = 1 / (a * d - b * c);
            ret[0] = detA * d;
            ret[1] = -detA * b;
            ret[2] = -detA * c;
            ret[3] = detA * a;
            return ret;
        },

        /*
         * The inverse of a 3x3 matrix:
        | a11 a12 a13 |-1             |   a33a22-a32a23  -(a33a12-a32a13)   a23a12-a22a13  |
        | a21 a22 a23 |    =  1/DET * | -(a33a21-a31a23)   a33a11-a31a13  -(a23a11-a21a13) |
        | a31 a32 a33 |               |   a32a21-a31a22  -(a32a11-a31a12)   a22a11-a21a12  |
        with DET  =  a11(a33a22-a32a23)-a21(a33a12-a32a13)+a31(a23a12-a22a13)
        */

        invMatrix3x3: function(a11, a12, a13, a21, a22, a23, a31, a32, a33) {
            detA = 1 / (a11(a33 * a22 - a32 * a23) - a21(a33 * a12 - a32 * a13) + a31 * (a23 * a12 - a22 * a13));
            var ret = new Array(9);
            ret[0] = detA * (a33 * a22 - a32 * a23);
            ret[1] = -detA * (a33 * a12 - a32 * a13);
            ret[2] = detA * (a23 * a12 - a22 * a13);
            ret[3] = -detA * (a33 * a21 - a31 * a23)
            ret[4] = detA * (a33 * a11 - a31 * a13);
            ret[5] = -detA * (a23 * a11 - a21 * a13);
            ret[6] = detA * (a32 * a21 - a31 * a22);
            ret[7] = -detA * (a32 * a11 - a31 * a12);
            ret[8] = detA * (a22 * a11 - a21 * a12);
            return ret;
        },

        invMatrix4x4: function(matrix, result) {
            var result = new Array(16);
            var tmp_0 = matrix[10] * matrix[15];
            var tmp_1 = matrix[14] * matrix[11];
            var tmp_2 = matrix[6] * matrix[15];
            var tmp_3 = matrix[14] * matrix[7];
            var tmp_4 = matrix[6] * matrix[11];
            var tmp_5 = matrix[10] * matrix[7];
            var tmp_6 = matrix[2] * matrix[15];
            var tmp_7 = matrix[14] * matrix[3];
            var tmp_8 = matrix[2] * matrix[11];
            var tmp_9 = matrix[10] * matrix[3];
            var tmp_10 = matrix[2] * matrix[7];
            var tmp_11 = matrix[6] * matrix[3];
            var tmp_12 = matrix[8] * matrix[13];
            var tmp_13 = matrix[12] * matrix[9];
            var tmp_14 = matrix[4] * matrix[13];
            var tmp_15 = matrix[12] * matrix[5];
            var tmp_16 = matrix[4] * matrix[9];
            var tmp_17 = matrix[8] * matrix[5];
            var tmp_18 = matrix[0] * matrix[13];
            var tmp_19 = matrix[12] * matrix[1];
            var tmp_20 = matrix[0] * matrix[9];
            var tmp_21 = matrix[8] * matrix[1];
            var tmp_22 = matrix[0] * matrix[5];
            var tmp_23 = matrix[4] * matrix[1];

            var t0 = ((tmp_0 * matrix[5] + tmp_3 * matrix[9] + tmp_4 * matrix[13]) - (tmp_1 * matrix[5] + tmp_2 * matrix[9] + tmp_5 * matrix[13]));
            var t1 = ((tmp_1 * matrix[1] + tmp_6 * matrix[9] + tmp_9 * matrix[13]) - (tmp_0 * matrix[1] + tmp_7 * matrix[9] + tmp_8 * matrix[13]));
            var t2 = ((tmp_2 * matrix[1] + tmp_7 * matrix[5] + tmp_10 * matrix[13]) - (tmp_3 * matrix[1] + tmp_6 * matrix[5] + tmp_11 * matrix[13]));
            var t3 = ((tmp_5 * matrix[1] + tmp_8 * matrix[5] + tmp_11 * matrix[9]) - (tmp_4 * matrix[1] + tmp_9 * matrix[5] + tmp_10 * matrix[9]));

            var d1 = (matrix[0] * t0 + matrix[4] * t1 + matrix[8] * t2 + matrix[12] * t3);
            if (Math.abs(d1) < 1e-5) {
                console.log("Warning can't inverse matrix " + matrix);
                if (result !== undefined) {
                    return false;
                } else {
                    result = [1.0, 0.0, 0.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 0.0, 0.0, 1.0
                    ];
                }
            }
            var d = 1.0 / d1;

            var out_00 = d * t0;
            var out_01 = d * t1;
            var out_02 = d * t2;
            var out_03 = d * t3;

            var out_10 = d * ((tmp_1 * matrix[4] + tmp_2 * matrix[8] + tmp_5 * matrix[12]) - (tmp_0 * matrix[4] + tmp_3 * matrix[8] + tmp_4 * matrix[12]));
            var out_11 = d * ((tmp_0 * matrix[0] + tmp_7 * matrix[8] + tmp_8 * matrix[12]) - (tmp_1 * matrix[0] + tmp_6 * matrix[8] + tmp_9 * matrix[12]));
            var out_12 = d * ((tmp_3 * matrix[0] + tmp_6 * matrix[4] + tmp_11 * matrix[12]) - (tmp_2 * matrix[0] + tmp_7 * matrix[4] + tmp_10 * matrix[12]));
            var out_13 = d * ((tmp_4 * matrix[0] + tmp_9 * matrix[4] + tmp_10 * matrix[8]) - (tmp_5 * matrix[0] + tmp_8 * matrix[4] + tmp_11 * matrix[8]));

            var out_20 = d * ((tmp_12 * matrix[7] + tmp_15 * matrix[11] + tmp_16 * matrix[15]) - (tmp_13 * matrix[7] + tmp_14 * matrix[11] + tmp_17 * matrix[15]));
            var out_21 = d * ((tmp_13 * matrix[3] + tmp_18 * matrix[11] + tmp_21 * matrix[15]) - (tmp_12 * matrix[3] + tmp_19 * matrix[11] + tmp_20 * matrix[15]));
            var out_22 = d * ((tmp_14 * matrix[3] + tmp_19 * matrix[7] + tmp_22 * matrix[15]) - (tmp_15 * matrix[3] + tmp_18 * matrix[7] + tmp_23 * matrix[15]));
            var out_23 = d * ((tmp_17 * matrix[3] + tmp_20 * matrix[7] + tmp_23 * matrix[11]) - (tmp_16 * matrix[3] + tmp_21 * matrix[7] + tmp_22 * matrix[11]));

            var out_30 = d * ((tmp_14 * matrix[10] + tmp_17 * matrix[14] + tmp_13 * matrix[6]) - (tmp_16 * matrix[14] + tmp_12 * matrix[6] + tmp_15 * matrix[10]));
            var out_31 = d * ((tmp_20 * matrix[14] + tmp_12 * matrix[2] + tmp_19 * matrix[10]) - (tmp_18 * matrix[10] + tmp_21 * matrix[14] + tmp_13 * matrix[2]));
            var out_32 = d * ((tmp_18 * matrix[6] + tmp_23 * matrix[14] + tmp_15 * matrix[2]) - (tmp_22 * matrix[14] + tmp_14 * matrix[2] + tmp_19 * matrix[6]));
            var out_33 = d * ((tmp_22 * matrix[10] + tmp_16 * matrix[2] + tmp_21 * matrix[6]) - (tmp_20 * matrix[6] + tmp_23 * matrix[10] + tmp_17 * matrix[2]));

            result[0] = out_00;
            result[1] = out_01;
            result[2] = out_02;
            result[3] = out_03;
            result[4] = out_10;
            result[5] = out_11;
            result[6] = out_12;
            result[7] = out_13;
            result[8] = out_20;
            result[9] = out_21;
            result[10] = out_22;
            result[11] = out_23;
            result[12] = out_30;
            result[13] = out_31;
            result[14] = out_32;
            result[15] = out_33;
            return result;
        },

        //----------Ray Casting------------------
        //modify from http://polyk.ivank.net
        //cast a ray to edge of threejs poly linestring
        Raycast: function(p, la, x, y, dx, dy, isc) {

            var l = p.length;
            var a1 = new _P(0, 0),
                a2 = new _P(0, 0),
                b1 = new _P(0, 0),
                b2 = new _P(0, 0),
                c = new _P(0, 0);
            //ray line
            a1.x = x;
            a1.y = y;
            a2.x = x + dx;
            a2.y = y + dy;

            if (isc == null) isc = {
                dist: 0,
                edge: 0,
                line: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 0
                },
                intersectPt: {
                    x: 0,
                    y: 0
                },
                norm: {
                    x: 0,
                    y: 0
                },
                refl: {
                    x: 0,
                    y: 0
                }
            };
            isc.dist = Infinity;
            var j;
            for (var i = 0; i < l; i += 2) {
                j = i / 2;
                if (la[j] === la[j + 1]) {
                    b1.x = p[i];
                    b1.y = p[i + 1];
                    b2.x = p[i + 2];
                    b2.y = p[i + 3];
                    var nisc = this.RayLineIntersection(a1, a2, b1, b2, c);
                    if (nisc) this.updateISC(dx, dy, a1, b1, b2, c, i / 2, isc, nisc);
                }
            }

            return (isc.dist != Infinity) ? isc : null;
        },

        //cast on threejs linestring
        Raycast2: function(p, v1, v2) {

            var l = p.length;
            var a1 = new _P(0, 0),
                a2 = new _P(0, 0),
                b1 = new _P(0, 0),
                b2 = new _P(0, 0),
                c = new _P(0, 0);
            //ray line
            a1.x = v1.x;
            a1.y = v1.z;
            a2.x = v2.x;
            a2.y = v2.z;

            var isc = {
                dist: 0,
                edge: 0,
                line: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 0
                },
                intersectPt: {
                    x: 0,
                    y: 0
                },
                norm: {
                    x: 0,
                    y: 0
                },
                refl: {
                    x: 0,
                    y: 0
                }
            };
            isc.dist = Infinity;
            for (var i = 0; i < l; i += 2) {
                b1.x = p[i].x;
                b1.y = p[i].z;
                b2.x = p[i + 1].x;
                b2.y = p[i + 1].z;
                var nisc = this.RayLineIntersection(a1, a2, b1, b2, c);
                if (nisc) this.updateISC(v2.x, v2.y, a1, b1, b2, c, i / 2, isc, nisc);
            }

            return (isc.dist != Infinity) ? isc : null;
        },

        RayLineIntersection: function(a1, a2, b1, b2, c) {
            var dax = (a1.x - a2.x),
                dbx = (b1.x - b2.x);
            var day = (a1.y - a2.y),
                dby = (b1.y - b2.y);

            var Den = dax * dby - day * dbx;
            if (Den == 0) return null; // parallel

            var A = (a1.x * a2.y - a1.y * a2.x);
            var B = (b1.x * b2.y - b1.y * b2.x);

            var I = c;
            var iDen = 1 / Den;
            I.x = (A * dbx - dax * B) * iDen;
            I.y = (A * dby - day * B) * iDen;

            if (!this.InRect(I, b1, b2)) return null;
            if ((day > 0 && I.y > a1.y) || (day < 0 && I.y < a1.y)) return null;
            if ((dax > 0 && I.x > a1.x) || (dax < 0 && I.x < a1.x)) return null;
            return I;
        },

        InRect: function(a, b, c) {
            if (b.x == c.x) return (a.y >= Math.min(b.y, c.y) && a.y <= Math.max(b.y, c.y));
            if (b.y == c.y) return (a.x >= Math.min(b.x, c.x) && a.x <= Math.max(b.x, c.x));

            if (a.x >= Math.min(b.x, c.x) && a.x <= Math.max(b.x, c.x) && a.y >= Math.min(b.y, c.y) && a.y <= Math.max(b.y, c.y))
                return true;
            return false;
        },
        updateISC: function(dx, dy, a1, b1, b2, c, edge, isc, I) {
            var nrl = _P.dist(a1, c);
            if (nrl < isc.dist) {
                var ibl = 1 / _P.dist(b1, b2);
                var nx = -(b2.y - b1.y) * ibl;
                var ny = (b2.x - b1.x) * ibl;
                var ddot = 2 * (dx * nx + dy * ny);
                isc.dist = nrl;
                isc.norm.x = nx;
                isc.norm.y = ny;
                isc.refl.x = -ddot * nx + dx;
                isc.refl.y = -ddot * ny + dy;
                isc.edge = edge;
                isc.line.x1 = b1.x;
                isc.line.y1 = b1.y;
                isc.line.x2 = b2.x;
                isc.line.y2 = b2.y;
                isc.intersectPt.x = I.x;
                isc.intersectPt.y = I.y;
            }
        },

        //project point on closest egde of poly
        //note: p is poly linestring of threejs
        projectPointOnLine: function(p, pt) {
            var l = p.length;
            var a1 = new _P(0, 0),
                b1 = new _P(0, 0),
                b2 = new _P(0, 0),
                c = new _P(0, 0);
            a1.x = pt.x;
            a1.y = pt.z;

            var isc = {
                dist: Infinity,
                edge: 0,
                line: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 0
                },
                point: {
                    x: 0,
                    y: 0
                },
                norm: {
                    x: 0,
                    y: 0
                }
            };
            //var j;
            for (var i = 0; i < l; i += 2) {
                b1.x = p[i].x;
                b1.y = p[i].z;
                b2.x = p[i + 1].x;
                b2.y = p[i + 1].z;
                this.pointLineDist(a1, b1, b2, i >> 1, isc);
            }

            var idst = 1 / isc.dist;
            isc.norm.x = (pt.x - isc.point.x) * idst;
            isc.norm.y = (pt.z - isc.point.y) * idst;
            return isc;
        },
        pointLineDist: function(p, a, b, edge, isc) {
            var x = p.x,
                y = p.y,
                x1 = a.x,
                y1 = a.y,
                x2 = b.x,
                y2 = b.y;

            var A = x - x1;
            var B = y - y1;
            var C = x2 - x1;
            var D = y2 - y1;

            var dot = A * C + B * D;
            var len_sq = C * C + D * D;
            var param = dot / len_sq;

            var xx, yy;

            if (param < 0 || (x1 == x2 && y1 == y2)) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }

            var dx = x - xx;
            var dy = y - yy;
            var dst = Math.sqrt(dx * dx + dy * dy);
            if (dst < isc.dist) {
                isc.dist = dst;
                isc.edge = edge;
                isc.point.x = xx;
                isc.point.y = yy;
                isc.line.x1 = a.x;
                isc.line.y1 = a.y;
                isc.line.x2 = b.x;
                isc.line.y2 = b.y;
            }
        },

        //slice poly into two parts, used this function to delete
        //artifacts from OpenData line string ray casting!
        slice: function(p, ax, ay, bx, by) {
            if (this.ContainsPoint(p, ax, ay) || this.ContainsPoint(p, bx, by)) return [p.slice(0)];

            var a = new _P(ax, ay);
            var b = new _P(bx, by);
            var iscs = []; // intersections
            var ps = []; // points
            for (var i = 0; i < p.length; i += 2) ps.push(new _P(p[i], p[i + 1]));

            for (var i = 0; i < ps.length; i++) {
                var isc = new _P(0, 0);
                isc = this._GetLineIntersection(a, b, ps[i], ps[(i + 1) % ps.length], isc);

                if (isc) {
                    isc.flag = true;
                    iscs.push(isc);
                    ps.splice(i + 1, 0, isc);
                    i++;
                }
            }
            if (iscs.length == 0) return [p.slice(0)];
            var comp = function(u, v) {
                return _P.dist(a, u) - _P.dist(a, v);
            }
            iscs.sort(comp);

            var pgs = [];
            var dir = 0;
            while (iscs.length > 0) {
                var n = ps.length;
                var i0 = iscs[0];
                var i1 = iscs[1];
                var ind0 = ps.indexOf(i0);
                var ind1 = ps.indexOf(i1);
                var solved = false;

                if (this._firstWithFlag(ps, ind0) == ind1) solved = true;
                else {
                    i0 = iscs[1];
                    i1 = iscs[0];
                    ind0 = ps.indexOf(i0);
                    ind1 = ps.indexOf(i1);
                    if (this._firstWithFlag(ps, ind0) == ind1) solved = true;
                }
                if (solved) {
                    dir--;
                    var pgn = this._getPoints(ps, ind0, ind1);
                    pgs.push(pgn);
                    ps = this._getPoints(ps, ind1, ind0);
                    i0.flag = i1.flag = false;
                    iscs.splice(0, 2);
                    if (iscs.length == 0) pgs.push(ps);
                } else {
                    dir++;
                    iscs.reverse();
                }
                if (dir > 1) break;
            }
            var result = [];
            for (var i = 0; i < pgs.length; i++) {
                var pg = pgs[i];
                var npg = [];
                for (var j = 0; j < pg.length; j++) npg.push(pg[j].x, pg[j].y);
                result.push(npg);
            }
            return result;
        },

        /*TODO: use this function to check if line string points are inside poly which
         *created from Bati 3D d'OpenData. The idea is that we do ray casting with Bati 3D
         * to detect front of building (facades), a poly is created from these facades. Finally, we
         * check if the lines are inside the poly which permet to hide invisible lines from scene*/
        containsPoint: function(p, px, py) {
            var n = p.length >> 1;
            var ax, ay, bx = p[2 * n - 2] - px,
                by = p[2 * n - 1] - py;
            var depth = 0;
            for (var i = 0; i < n; i++) {
                ax = bx;
                ay = by;
                bx = p[2 * i] - px;
                by = p[2 * i + 1] - py;
                if (ay < 0 && by < 0) continue; // both "up" or both "donw"
                if (ay >= 0 && by >= 0) continue; // both "up" or both "donw"
                if (ax < 0 && bx < 0) continue;

                var lx = ax + (bx - ax) * (-ay) / (by - ay);
                if (lx > 0) depth++;
            }
            return (depth & 1) == 1;
        },

        //px, py sont coords d'emprise du sol
        extractLineStringInsidePoly: function(px, py, l) {
            var lines = [];
            if (px.length !== py.length) {
                console.warn("poly bounding box have wrong structure!!!");
                return false;
            } else {
                var p = [];
                for (var i = 0; i < px.length; i++) {
                    p.push(px[i]);
                    p.push(py[i])
                }
                for (var i = 0; i < l.length - 4; i += 4) {
                    if (this.containsPoint(p, l[i], l[i + 1]) && this.containsPoint(p, l[i + 2], l[i + 3])) {
                        lines.push(l[i]);
                        lines.push(l[i + 1]);
                        lines.push(l[i + 2]);
                        lines.push(l[i + 3]);
                    }
                }

            }
            return lines;
        },

        convex: function(ax, ay, bx, by, cx, cy) {
            return (ay - by) * (cx - bx) + (bx - ax) * (cy - by) >= 0;
        },

        polyIsConvex: function(p) {
            if (p.length < 6) return true;
            var l = p.length - 4;
            for (var i = 0; i < l; i += 2)
                if (!this.convex(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5])) return false;
            if (!this.convex(p[l], p[l + 1], p[l + 2], p[l + 3], p[0], p[1])) return false;
            if (!this.convex(p[l + 2], p[l + 3], p[0], p[1], p[2], p[3])) return false;
            return true;
        },

        getLineIntersection: function(a1, a2, b1, b2, c) {
            var dax = (a1.x - a2.x),
                dbx = (b1.x - b2.x);
            var day = (a1.y - a2.y),
                dby = (b1.y - b2.y);

            var Den = dax * dby - day * dbx;
            if (Den == 0) return null; // parallel

            var A = (a1.x * a2.y - a1.y * a2.x);
            var B = (b1.x * b2.y - b1.y * b2.x);

            var I = c;
            I.x = (A * dbx - dax * B) / Den;
            I.y = (A * dby - day * B) / Den;

            if (this.InRect(I, a1, a2) && this.InRect(I, b1, b2)) return I;
            return null;
        },
        getAreaPoly: function(p) {
            if (p.length < 6) return 0;
            var l = p.length - 2;
            var sum = 0;
            for (var i = 0; i < l; i += 2)
                sum += (p[i + 2] - p[i]) * (p[i + 1] + p[i + 3]);
            sum += (p[0] - p[l]) * (p[l + 1] + p[1]);
            return -sum * 0.5;
        },
        removDuplicateArray: function(arr) {
            var temp = {};
            for (var i = 0; i < arr.length; i++)
                temp[arr[i]] = true;
            var r = [];
            for (var k in temp)
                r.push(k);
            return r;
        },

        checkSign: function(a, b) {
            return ((a * b) >= 0);
        },

        //this function returns commun point if two lines are intersected.
        //it is different from Raycast* function where the point is located
        //from two vectors.
        getLineIntersection2: function(p1, p2, p3, p4) {
            var x1 = p1.x,
                y1 = p1.y,
                x2 = p2.x,
                y2 = p2.y,
                x3 = p3.x,
                y3 = p3.y,
                x4 = p4.x,
                y4 = p4.y;

            var a1, a2, b1, b2, c1, c2;
            var r1, r2, r3, r4;
            var denom, offset, num;

            // Compute a1, b1, c1, where line joining points 1 and 2
            // is "a1 x + b1 y + c1 = 0".
            a1 = y2 - y1;
            b1 = x1 - x2;
            c1 = (x2 * y1) - (x1 * y2);

            // Compute r3 and r4.
            r3 = ((a1 * x3) + (b1 * y3) + c1);
            r4 = ((a1 * x4) + (b1 * y4) + c1);

            // Check signs of r3 and r4. If both point 3 and point 4 lie on
            // same side of line 1, the line segments do not intersect.
            if ((r3 != 0) && (r4 != 0) && this.checkSign(r3, r4)) {
                return -1;
            }

            // Compute a2, b2, c2
            a2 = y4 - y3;
            b2 = x3 - x4;
            c2 = (x4 * y3) - (x3 * y4);

            // Compute r1 and r2
            r1 = (a2 * x1) + (b2 * y1) + c2;
            r2 = (a2 * x2) + (b2 * y2) + c2;

            // Check signs of r1 and r2. If both point 1 and point 2 lie
            // on same side of second line segment, the line segments do
            // not intersect.
            if ((r1 != 0) && (r2 != 0) && (this.checkSign(r1, r2))) {
                return -1;
            }

            //Line segments intersect: compute intersection point.
            denom = (a1 * b2) - (a2 * b1);

            if (denom == 0) {
                return -1;
            }

            if (denom < 0) {
                offset = -denom / 2;
            } else {
                offset = denom / 2;
            }

            // The denom/2 is to get rounding instead of truncating. It
            // is added or subtracted to the numerator, depending upon the
            // sign of the numerator.
            var point = {
                x: 0,
                y: 0,
                dist: 0
            };
            num = (b1 * c2) - (b2 * c1);
            if (num < 0) {
                point.x = (num - offset) / denom;
            } else {
                point.x = (num + offset) / denom;
            }

            num = (a2 * c1) - (a1 * c2);
            if (num < 0) {
                point.y = (num - offset) / denom;
            } else {
                point.y = (num + offset) / denom;
            }
            point.dist = Math.sqrt((point.x - p1.x) * (point.x - p1.x) + (point.y - p1.y) * (point.y - p1.y));
            // lines_intersect
            return point;
        },

        getIntersectLinePoly: function(p, pt1, pt2) {

            var l = p.length;
            var a1 = new _P(0, 0),
                a2 = new _P(0, 0),
                b1 = new _P(0, 0),
                b2 = new _P(0, 0),
                I = new _P(0, 0);
            //ray line
            a1.x = pt1.x;
            a1.y = pt1.z;
            a2.x = pt2.x;
            a2.y = pt2.z;
            var min_dist = Infinity;
            for (var i = 0; i < l; i += 2) {
                b1.x = p[i].x;
                b1.y = p[i].z;
                b2.x = p[i + 1].x;
                b2.y = p[i + 1].z;
                var isc = this.getLineIntersection2(a1, a2, b1, b2);
                if (isc !== -1) { //check if intersect
                    //console.warn(nrl);
                    if (isc.dist < min_dist) {
                        I.x = isc.x;
                        I.y = isc.y;
                    }
                    min_dist = isc.dist;
                }
            }

            return I;
        },

        lambert93ToWGS: function(lambertCoords) {
            var wgsLonLat = new OpenLayers.LonLat(lambertCoords.x, lambertCoords.y);
            wgsLonLat.transform(new OpenLayers.Projection("EPSG:2154"), new OpenLayers.Projection("CRS:84"));
            return wgsLonLat;
        },

        wgsToLambert93: function(wgsCoords) {
            var lambertCoords = new OpenLayers.LonLat(wgsCoords.lon, wgsCoords.lat);
            lambertCoords.transform(new OpenLayers.Projection("CRS:84"), new OpenLayers.Projection("EPSG:2154"));
            return {
                x: lambertCoords.lon,
                y: lambertCoords.lat
            };
        },


        // http://fr.wikipedia.org/wiki/MÃ©thode_de_Cardan  Thanks Bredif
        cardan_cubic_roots: function(a, b, c, d) {

            if (a == 0) return this.quadratic_roots(b, c, d);
            var vt = -b / (3 * a);
            var a2 = a * a;
            var b2 = b * b;
            var a3 = a * a2;
            var b3 = b * b2;
            var p = c / a - b2 / (3 * a2);
            var q = b3 / (a3 * 13.5) + d / a - b * c / (3 * a2);
            if (p == 0) {
                var x = this.cubic_root(-q) + vt;
                return [x, x, x];
            }
            var p3_4_27 = p * p * p * 4 / 27;
            var del = q * q + p3_4_27;

            if (del > 0) {
                var sqrt_del = Math.sqrt(del);
                var u = this.cubic_root((-q + sqrt_del) / 2);
                var v = this.cubic_root((-q - sqrt_del) / 2);
                return [u + v + vt];
            } else if (del == 0) {
                var z0 = 3 * q / p;
                var x0 = vt + z0;
                var x12 = vt - z0 * 0.5;
                return [x0, x12, x12];
            } else // (del < 0)
            {
                var kos = Math.acos(-q / Math.sqrt(p3_4_27));
                var r = 2 * Math.sqrt(-p / 3)
                return [
                    r * Math.cos((kos) / 3) + vt,
                    r * Math.cos((kos + Math.PI) / 3) + vt,
                    r * Math.cos((kos + 2 * Math.PI) / 3) + vt
                ];
            }
        },

        quadratic_roots: function(a, b, c) {
            var delta = b * b - 4 * a * c;
            if (delta < 0) return [];
            var x0 = -b / (2 * a);
            if (delta == 0) return [x0];
            var sqr_delta_2a = Math.sqrt(delta) / (2 * a);
            return [x0 - sqr_delta_2a, x0 + sqr_delta_2a];
        },

        sgn: function(x) {
            return (x > 0) - (x < 0);
        },

        cubic_root: function(x) {
            return this.sgn(x) * Math.pow(Math.abs(x), 1 / 3);
        },


        // Return sun position with azimuth and altitude in rad
        getSunPosition: function() {

            var m = Math,
                PI = m.PI,
                sin = m.sin,
                cos = m.cos,
                tan = m.tan,
                asin = m.asin,
                atan = m.atan2;

            var rad = PI / 180,
                dayMs = 1000 * 60 * 60 * 24,
                J1970 = 2440588,
                J2000 = 2451545,
                e = rad * 23.4397; // obliquity of the Earth

            function toJulian(date) {
                return date.valueOf() / dayMs - 0.5 + J1970;
            }

            function toDays(date) {
                return toJulian(date) - J2000;
            }

            function getRightAscension(l, b) {
                return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
            }

            function getDeclination(l, b) {
                return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
            }

            function getAzimuth(H, phi, dec) {
                return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
            }

            function getAltitude(H, phi, dec) {
                return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
            }

            function getSiderealTime(d, lw) {
                return rad * (280.16 + 360.9856235 * d) - lw;
            }

            function getSolarMeanAnomaly(d) {
                return rad * (357.5291 + 0.98560028 * d);
            }

            function getEquationOfCenter(M) {
                return rad * (1.9148 * sin(M) + 0.0200 * sin(2 * M) + 0.0003 * sin(3 * M));
            }

            function getEclipticLongitude(M, C) {
                var P = rad * 102.9372; // perihelion of the Earth
                return M + C + P + PI;
            }

            return function getSunPosition(date, lat, lon) {
                var lw = rad * -lon,
                    phi = rad * lat,
                    d = toDays(date),
                    M = getSolarMeanAnomaly(d),
                    C = getEquationOfCenter(M),
                    L = getEclipticLongitude(M, C),
                    D = getDeclination(L, 0),
                    A = getRightAscension(L, 0),
                    t = getSiderealTime(d, lw),
                    H = t - A;

                return {
                    altitude: getAltitude(H, phi, D),
                    azimuth: getAzimuth(H, phi, D) + PI // - PI/2 // origin: north !!! not like original Mourner code but more classical ref
                };
            };


        },

        // Return scene coordinate ({x,y,z}) of sun
        getSunPositionInScene: function(date, lat, lon) {

            if (lat == undefined) {
                var currentPosWGS84 = Cartography.convertCoordVec3(Cartography.getCurrentPosition(), "EPSG:2154", "CRS:84");
                lat = currentPosWGS84.z;
                lon = currentPosWGS84.x;
            }
            var sun = Utils.getSunPosition()(date, lat, lon);
            var length = 2000; // distance of the sun from the earth
            var direction = {
                x: 0,
                y: 0
            };
            direction.x = Math.sin(sun.azimuth) * length;
            direction.y = Math.cos(sun.azimuth) * length;
            var realalti = Math.sin(sun.altitude) * length;

            //console.log(direction, realalti);

            return {
                x: direction.x,
                y: realalti,
                z: direction.y
            };
        }



    };

    return Utils;
});
