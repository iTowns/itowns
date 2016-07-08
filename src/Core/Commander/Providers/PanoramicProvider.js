/**
 * Creates a provider for panoramic images/
 * Get metadata for extrinseque info and also intrinseque
 * @class Manage the panoramic provider (url, request)
 * @author alexandre devaux IGN
 * @requires ThreeJS
 *
 */

/* global Promise*/

 define ('Core/Commander/Providers/PanoramicProvider',
       ['three',
        'when',
        'Core/Commander/Providers/Provider',
        'Core/Commander/Providers/BuildingBox_Provider',
        'Renderer/ProjectiveTexturingMaterial',
        'Renderer/BasicMaterial',
        'MobileMapping/GeometryProj',
        'Renderer/PanoramicMesh'], function (

    THREE,
    when,
    Provider,
    BuildingBox_Provider,
    ProjectiveTexturingMaterial,
    BasicMaterial,
    GeometryProj,
    PanoramicMesh) {


    var _options = null,
        _urlPano = "",
        _urlImage = "",
        _urlCam = "",
        _panoramicsMetaData;


    function PanoramicProvider(options){

        if(options){
            _options  = options;
            _urlPano  = options.pano;
            _urlImage = options.url;
            _urlCam   = options.cam;
        }
        this.panoInfo = null;
        this.geometry = null;
        this.material = null;
        this.absoluteCenter = null; // pivot in fact here, not absoluteCenter
        this.geometryRoof = null;
        this.panoramicMesh = null;
        this.projectiveTexturedMesh = null;

    }

    PanoramicProvider.prototype = Object.create( Provider.prototype );
    PanoramicProvider.prototype.constructor = PanoramicProvider;


    PanoramicProvider.prototype.init = function(options){

            _urlPano  = options.pano;
            _urlImage = options.url;
            _urlCam   = options.cam;
    };

    /**
     * Return metadata info for panoramic closest to position in parameter
     * @param {type} longitude
     * @param {type} latitude
     * @param {type} distance
     * @returns {Promise}
     */
    PanoramicProvider.prototype.getMetaDataFromPos = function(longitude, latitude, distance){

        var that = this;
        if(!_panoramicsMetaData){

            var requestURL = _urlPano;    // TODO : string_format
            return new Promise(function(resolve, reject) {

              var req = new XMLHttpRequest();
              req.open('GET', requestURL);

              req.onload = function() {

                    if (req.status === 200) {

                        _panoramicsMetaData = JSON.parse(req.response);
                        var closestPano = that.getClosestPanoInMemory(longitude, latitude, distance);
                        resolve(closestPano);
                    }
                    else {
                      reject(Error(req.statusText));
                    }
              };

              req.onerror = function() {
                    reject(Error("Network Error"));
              };

              req.send();
            });

        }else{          // Trajectory file already loaded

                 var closestPano = that.getClosestPanoInMemory(longitude, latitude, distance);
                 return new Promise(function(resolve) {resolve(closestPano);});
        }
    };



    // USING MEMORISED TAB or JSON ORI
    PanoramicProvider.prototype.getClosestPanoInMemory = function(longitude, latitude){

        var indiceClosest = 0;
        var distMin = 99999;
        for (var i=0; i< _panoramicsMetaData.length; ++i){

            var p = _panoramicsMetaData[i];
            var dist = Math.sqrt( (p.longitude - longitude) * (p.longitude - longitude) + (p.latitude - latitude) * (p.latitude - latitude) );
            if(dist< distMin) {indiceClosest = i; distMin = dist;}
        }
        this.panoInfo = _panoramicsMetaData[indiceClosest];
        return [_panoramicsMetaData[indiceClosest]];
    };



    PanoramicProvider.prototype.getTextureMaterial = function(panoInfo, pivot){

        return ProjectiveTexturingMaterial.init(_options, panoInfo, pivot);  // Initialize itself Ori

        // ProjectiveTexturingMaterial.createShaderMat(_options);
        // return ProjectiveTexturingMaterial.getShaderMat();
    };


    PanoramicProvider.prototype.updateTextureMaterial = function(panoInfo, pivot){

        ProjectiveTexturingMaterial.updateUniforms(panoInfo, pivot);
    };


    PanoramicProvider.prototype.getGeometry = function(longitude, latitude, altitude){

        var w = 0.003;
        var bbox = {minCarto:{longitude:longitude - w, latitude:latitude - w}, maxCarto: {longitude:longitude + w, latitude:latitude + w}};
        //console.log(bbox);
        var options = options || {url:"http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?",
                       typename:"BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie",
                       bbox: bbox,
                       epsgCode: 4326
                      };

        var buildingBox_Provider = new BuildingBox_Provider(options);

        var deferred = when.defer();
        buildingBox_Provider.getData(options.bbox, altitude).then(function(){

            deferred.resolve({geometry: buildingBox_Provider.geometry, pivot:buildingBox_Provider.pivot, roof: buildingBox_Provider.geometryRoof});
        }.bind(this));

        return deferred.promise;
    };


    // Manages 3 asynchronous functions
    // - Get Pano closest to lon lat (panoramic metadata)
    // - Get sensors informations (camera calibration)
    // - Get Building boxes from WFS
    PanoramicProvider.prototype.getTextureProjectiveMesh = function(longitude, latitude, distance){

        var deferred = when.defer();
        var that = this;
        this.getMetaDataFromPos(longitude, latitude, distance).then(function(panoInfo){             // Get METADATA PANO

           // console.log("panoInfo", panoInfo);
            that.getGeometry(panoInfo[0].longitude, panoInfo[0].latitude, panoInfo[0].altitude).then(function(data){      // GET GEOMETRY

                that.geometry = data.geometry;
                that.absoluteCenter = data.pivot; // pivot in fact here, not absoluteCenter
                that.geometryRoof = data.roof;

                that.getTextureMaterial(panoInfo[0], that.absoluteCenter).then(function(shaderMaterial){                 // GET MATERIAL

                    that.material = shaderMaterial; //new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide});
                    //that.projectiveTexturedMesh = new THREE.Mesh(that.geometry, that.material);
                    that.panoramicMesh = new PanoramicMesh(that.geometry, that.material, that.absoluteCenter);
                    that.panoramicMesh.name = "wallMesh";
                    var roofMesh = new PanoramicMesh(that.geometryRoof, new BasicMaterial(new THREE.Color( 0xdddddd )), that.absoluteCenter);
                    roofMesh.name = "roofMesh";
                    roofMesh.material.side =  THREE.DoubleSide;
                    roofMesh.material.transparent  = true;
                    roofMesh.setDisplayed(true);
                    roofMesh.material.uniforms.lightOn.value = false;

                    that.panoramicMesh.add(roofMesh);

                   // console.log(that.panoramicMesh);
                   // console.log(roofMesh);
                    deferred.resolve(that.panoramicMesh);

                });

            }.bind(that));

        });
        return deferred.promise;
    };

    // Update existing panoramic mesh with new images look for the closest to parameters position
    PanoramicProvider.prototype.updateMaterialImages = function(longitude, latitude, distance){

      var deferred = when.defer();
      var that = this;
      this.getMetaDataFromPos(longitude, latitude, distance).then(function(panoInfo){             // Get METADATA PANO

          deferred.resolve(panoInfo[0]);
          that.updateTextureMaterial(panoInfo[0], that.absoluteCenter);



      });
      return deferred.promise;
    };


    PanoramicProvider.prototype.getUrlImageFile = function(){
        return _urlImage;
    };

    PanoramicProvider.prototype.getMetaDataSensorURL = function(){
        return _urlCam;
    };

    PanoramicProvider.prototype.getMetaDataSensor = function(){


    };



    return PanoramicProvider;

});
