
/**
*
* @author AD IGN
* Class where we get the Extrinseque and Intrinseque parameters of the system. Camera (laser soon).
* Next we will dynamically load configuration from server in case of changes
* @Depends Sensor.js
*/

define('MobileMapping/Ori',['three','MobileMapping/Sensor', 'when'],
  function (THREE, Sensor, when) {

    var Ori = {

      initiated:false,
      options:null,
      sensors:[],

      init: function(options){


        var that = this;
        var baseUrl = options.cam;// PanoramicProvider.getMetaDataSensorURL();

        var deferred = when.defer();

        var request = new XMLHttpRequest();
        request.open('GET', baseUrl, true);

        request.onload = function() {
          if (request.status >= 200 && request.status < 400) {

            var data = JSON.parse(request.responseText);
            that.handleDBData(data);
            deferred.resolve(this.initiated);
          } else {
            //  console.log("error loading MetaDataSensorURL");
          }
        };

        request.onerror = function() {
          //console.log("error loading MetaDataSensorURL");
        };

        request.send();
        return deferred.promise;
      },

      handleDBData :function(data){
        for (var i =0; i< data.length; ++i)  // For all DB sensor info we create sensor object
          this.sensors.push(new Sensor(data[i]));
        this.initiated = true;
       // console.log('Orientation module is loaded');
      },

      // Global orientation matrix of the vehicule
      // Warning: heading pitch roll not all in right side in itowns ref
      // Pitch and Roll are in opposite
      computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
        heading = (180 - parseFloat(heading) ) / 180 * Math.PI; // on itownsV1 parseFloat(heading) / 180 * Math.PI
        pitch = parseFloat(pitch)/ 180 * Math.PI;  // Deg to Rad // axe X
        roll = parseFloat(roll)/ 180 * Math.PI;  // Deg to Rad   // axe Z
        // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
        var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch,heading,-roll,'YXZ'),true);
        return new THREE.Matrix3().makeRotationFromQuaternion(q);
      },

      getPosition: function(){
        var sum = new THREE.Vector3(0,0,0);
        for (var i =0; i< this.sensors.length; ++i)
          sum = sum.add(this.sensors[i].position);
        return sum.divideScalar(this.sensors.length);
      },

      // deprecated methods
      getDistortion: function(i){ return this.sensors[i].distortion; },
      getSommet    : function(i){ return this.sensors[i].position;   },
      getProjection: function(i){ return this.sensors[i].projection; },
      getRotation  : function(i){ return this.sensors[i].rotation;   },
      getMask      : function(i){ return this.sensors[i].mask;   },
      getSize      : function(i){ return this.sensors[i].size;   },
      getPPS       : function(i){ return this.sensors[i].pps;   },
      getMatrix    : function(i){ return new THREE.Matrix3().multiplyMatrices(this.getRotation(i),this.getProjection(i)); }
    };

    return Ori;
  }
  )
