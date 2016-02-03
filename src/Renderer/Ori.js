
/**
* 
* @author AD IGN
* Class where we get the Extrinseque and Intrinseque parameters of the system. Camera (laser soon).
* Next we will dynamically load configuration from server in case of changes
* @Depends Sensor.js
*/

define ('Renderer/Ori',[
    'THREE',
    'Renderer/Utils',
    'Renderer/Sensor'],
function (THREE,
        Utils,
        Sensor) {

    // Extrinseque Parameters
     var _MatCam21,   // Orientation matrices for camera, relatif
         _MatCam22,
         _MatCam23,
         _MatCam31,
         _MatCam32,
         _MatCam33,
         _MatCam34,
         _MatCam41,
         _MatCam42,
         _MatCam43,

         // Camera V2
         _MatCam300,
         _MatCam301,
         _MatCam302,
         _MatCam303,
         _MatCam304,
         
         // Som cam V1
         _SomCam21,
         _SomCam22,
         _SomCam23,
         _SomCam31,
         _SomCam32,
         _SomCam33,
         _SomCam34,
         _SomCam41,
         _SomCam42,
         _SomCam43,
     
        // Som cam V2
         _SomCam300,
         _SomCam301,
         _SomCam302,
         _SomCam303,
         _SomCam304,
     
     
     
         // TEMP Camera V1_2
         _MatCam312,
         _MatCam322,
         _MatCam332,
         _MatCam342,

     
         _cam21,   // Orientation matrices for camera, relatif
         _cam22,
         _cam23,
         _cam31,
         _cam32,
         _cam33,
         _cam34,
         _cam41,
         _cam42,
         _cam43,
         
         // TEMP Camera V1_2
         _cam312,
         _cam322,
         _cam332,
         _cam342,
         
         
         // Camera V2
         _cam300,
         _cam301,
         _cam302,
         _cam303,
         _cam304,
 
 
        //Distortion
        _r3_300 = -1.33791587603751819e-07,
        _r5_300 =  3.47540977328314388e-14,
        _r7_300 = -4.44103985918888078e-21,
        _r3_301 = -1.40358671178762456e-07,
        _r5_301 =  3.68704437301178485e-14,
        _r7_301 = -4.70823660788942483e-21,
        _r3_302 = -1.42783482918368782e-07,
        _r5_302 =  3.82282620491304991e-14 ,
        _r7_302 = -5.00364549921599885e-21,
        _r3_303 = -1.43584241381542442e-07,
        _r5_303 =  3.85479524108064982e-14 ,
        _r7_303 = -5.0301787584825994e-21,
        //  r3_304:{type:'f',value: -1.4331013261463578e-07},
        //  r5_304:{type:'f',value:3.77792882615437153e-14},
        //  r7_304:{type:'f',value:-4.83479389959883182e-21},
        //Test ac disto des ori.xml
        _r3_304 = -1.43882500e-007,
        _r5_304 =  3.68830500e-014,
        _r7_304 = -4.51909300e-021;
     
     
     
         // MATRIX TO GO FROM APPLANIX REF TO ITOWNS REF. ***********************
        
                                        
        var _itownsWay =    new THREE.Matrix4().set( 0, 1, 0, 0,
                                               0, 0,-1, 0,
                                               1, 0, 0, 0,
                                               0, 0, 0, 1 );
                                           
        var Photogram_JMM    = new THREE.Matrix4().set( 0, 0,-1, 0,
                                                 -1, 0, 0, 0,
                                                  0, 1, 0, 0,
                                                  0, 0, 0, 1);
                                               
        var photgramme_image = new THREE.Matrix4().set( 1, 0, 0, 0,
                                                  0,-1, 0, 0,
                                                  0, 0,-1, 0,
                                                  0, 0, 0, 1);

        
      // Intrinseque parameters
   
      var arrayCam = [];  // Contains all the cameras
      var arraySensors = []; // Contains all the sensors

      var Ori = {
           
          initiated:false, 
                 
          init: function(){
              
               // NOT YET FULLY USED!
               this.getAllSensorsInfosDBForChantier(1);  // We get info for all sensors from DB
              
               this.getAllMobileMatrices();  // From mobile file
               this.setAllMobileMatricesToItownsRef(); // To itownsREF
               
               this.getAllMobileSommet();    // From mobile file
               this.setAllMobileSommetToItownsRef(); // To itownsREF
               
          },
          
          
          // We get info for all sensors from DB
          getAllSensorsInfosDBForChantier: function(idChantier){

                var that = this;
                /*
                $.getJSON(PanoramicProvider.getMetaDataSensorURL(idChantier), function (data){
                           that.handleDBData(data);
                });
                */
               
                var requestURL = "../itowns-sample-data/cameraCalibration.json";    
                var req = new XMLHttpRequest();
                     req.open('GET', requestURL);

                      req.onload = function() {

                            if (req.status === 200) {
                                
                                var data = JSON.parse(req.response);
                                handleDBData(data);
                            }                   
                      };                          
           },


          // Create the cameras from the infos took in the DB, JSON
          // Transform all coordinates in itowns ref
          // Fill the array of Sensors
          
          handleDBData :function(data){

                arrayCam = data;
                for (var i =0; i< data.length; ++i){  // For all DB sens info we create sensor object
                    
                    var s = new Sensor(arrayCam[i]);
                    s.setMatrix(); //Utils.outputMatrix4(s.mat3d);
                    s.setSommet();
                    this.setMatOrientationTotalItownsRef(s);  // Change sensor matrix to iTowns Ref
                    this.setSommetToItownsRef(s);       // Change sensor sommet to iTowns Ref
                    arraySensors.push(s);
                }
                
                this.initiated = true;
                console.log('Orientation module is loaded');

           },

                   
        // Change the matrix of the sensor to itownsRef passing
        // through TS transformation first
        setMatOrientationTotalItownsRef: function(s){

          var out = s.mat3d.clone(); 
          out = new THREE.Matrix4().multiplyMatrices( out.clone(), Photogram_JMM.clone() ); 
          out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.getMatOrientationCapteur(s.infos.cam_orientation));
          out = new THREE.Matrix4().multiplyMatrices( out.clone(), photgramme_image.clone());

          out = new THREE.Matrix4().multiplyMatrices(_itownsWay, out.clone());

          s.mat3d = out;


        },


          // Change sommet coordinate from applanix repere to itowns
          // Xapplan -> Zitowns , Yapplan -> xitowns , Zapplan -> -Y itowns
          // -> matrice projCoord  
          setSommetToItownsRef: function(sensor){

              var projCoord = _itownsWay;
          // THEN in itowns coordinates
              sensor.sommet.applyProjection(projCoord);
          },


         // Global orientation matrix of the vehicule
         // Warning: heading pitch roll not all in right side in itowns ref
         // Pitch and Roll are in opposite
          computeMatOriFromHeadingPitchRoll: function(heading,pitch,roll){
              
              //  console.log(heading,pitch,roll);
                heading = parseFloat(heading) / 180 * Math.PI;  // Deg to Rad // Axe Y
                pitch = parseFloat(pitch)/ 180 * Math.PI;  // Deg to Rad // axe X
                roll = parseFloat(roll)/ 180 * Math.PI;  // Deg to Rad   // axe Z
        /*        var matRotationHead  = new THREE.Matrix4(); 
                var matRotationPitch = new THREE.Matrix4(); 
                var matRotationRoll  = new THREE.Matrix4(); 
                
                matRotationHead = Utils.rotateY( matRotationHead, heading).transpose();
                console.log("matrotationHead");
                Utils.outputMatrix4(matRotationHead);
                matRotationPitch = Utils.rotateX( matRotationPitch, pitch).transpose();
                matRotationRoll = Utils.rotateZ( matRotationRoll, roll).transpose();  // Pitch should be for x
             
             
                var mat1 =  new THREE.Matrix4().multiplyMatrices(matRotationPitch,matRotationRoll );
                console.log("mat1");
                Utils.outputMatrix4(mat1);
                var mat2 = new THREE.Matrix4().multiplyMatrices( matRotationHead,mat1);
                
                console.log("mat2");
                Utils.outputMatrix4(mat2);
                
          */      
                // With quaternion  //set rotation.order to "YXZ", which is equivalent to "heading, pitch, and roll"
                var q = new THREE.Quaternion();
                q.setFromEuler(new THREE.Euler(-pitch,heading,-roll,'YXZ'),true);
                var matTotale = new THREE.Matrix4().makeRotationFromQuaternion(q);//qRoll);//quater);
                //console.log('quater',qRoll);
                return matTotale;//.transpose(); //mat2 //matRotation;
          },
          

          

          // Global orientation matrix of the vehicule
          computeMatOriFromHeadingPitchRollSAVE: function(heading,pitch,roll){
              
                console.log(heading,pitch,roll);
                heading = parseFloat(heading) / 180 * Math.PI;  // Deg to Rad 
                pitch = parseFloat(pitch)/ 180 * Math.PI;  // Deg to Rad
                roll = parseFloat(roll)/ 180 * Math.PI;  // Deg to Rad
                var matRotation = new THREE.Matrix4(); 
                matRotation = Utils.rotateY( matRotation, -heading);
                matRotation = Utils.rotateX( matRotation, pitch);
                matRotation = Utils.rotateZ( matRotation, -roll);  // Pitch should be for x

                return matRotation;
          },
          
          
          
          // return matrix4 of projection using ppa focale etc
          getProjCam: function(num){
              
              
            var proj300 = new THREE.Matrix4().set(  1150.66785706630299,	0,	0.,	0.,
                                           0.,       1150.66785706630299,	0.,	0.,
                                           1030.29197487242254,  1023.03935469545331,	0.,	1.,
                                           0.,          0.,     0.,	0.);
                                           
            var proj301 = new THREE.Matrix4().set(  1134.10249915110944,	0,	0.,	0.,
                                           0.,         1134.10249915110944,	0.,	0.,
                                           1036.59553362753832,  1020.60367439771176,	0.,	1.,
                                           0.,          0.,     0.,	0.);
                                           
            var proj302 = new THREE.Matrix4().set(  1129.96581598065382,	0,	0.,	0.,
                                           0.,       1129.96581598065382,	0.,	0.,
                                           1044.51004790981142, 1023.12591368801895,	0.,	1.,
                                           0.,          0.,     0.,	0.);
                                           
            var proj303 = new THREE.Matrix4().set(1128.12363890680899,	0,	0.,	0.,
                                           0.,       1128.12363890680899,	0.,	0.,
                                           1027.81789269340265,  1024.17550959203095,	0.,	1.,
                                           0.,          0.,     0.,	0.);
       
           /*   
            var proj304 = new THREE.Matrix4(1128.70551522705205,	0,	0.,	0.,
                                           0.,       1128.70551522705205,	0.,	0.,
                                           1037.71094725878015,  1032.63268273716631,	0.,	1.,
                                           0.,          0.,     0.,	0.);                               
*/
          
              // Test ac la meme calib que celle des ori.xml
              var proj304 = new THREE.Matrix4().set(1125.964,	0,	0.,	0.,
                                           0.,       1125.964,	0.,	0.,
                                           1036.693,  1036.004,	0.,	1.,
                                           0.,          0.,     0.,	0.);                           

            switch(num){

                case 300: return proj300; 
                case 301: return proj301;
                case 302: return proj302; 
                case 303: return proj303; 
                case 304: return proj304; 
            }                              

         
              
              
          },
          
          
          
          
          // return 3rd degree polynomes for 5 cameras in order 3 cam0, 3 cam 1....
          getAllDistortionsPolynomes: function(){
             
             return [_r3_300,
                     _r5_300,
                     _r7_300,
                     _r3_301,
                     _r5_301,
                     _r7_301,
                     _r3_302,
                     _r5_302,
                     _r7_302,
                     _r3_303,
                     _r5_303,
                     _r7_303,
                     _r3_304,
                     _r5_304,
                     _r7_304];
          },
          
               
          // return 3rd degree polynomes for camera number in parameter
          getDistortionsPolynomesForCam: function(camNum){
              
              var arrAll = this.getAllDistortionsPolynomes();
              
              switch(camNum){

                case 300: return arrAll.slice(0,3); break;
                case 301: return arrAll.slice(3,6); break;
                case 302: return arrAll.slice(6,9); break;
                case 303: return arrAll.slice(9,12); break;
                case 304: return arrAll.slice(12,15);  break;
            }                              

          },
          
            
        getDistortion_r2max: function(distortion){
            // returned the square of the smallest positive root of the derivativeof the distortion polynomial
            // which tells where the distortion might no longer be bijective.
            var roots = Utils.cardan_cubic_roots(7*distortion[2],5*distortion[1],3*distortion[0],1);
            var imax=-1;
                for (var i in roots)
                    if(roots[i]>0 && (imax==-1 || roots[imax]>roots[i])) imax = i;
            if(imax==-1) return Infinity; // no roots : all is valid !
            return roots[imax];
        },
        
        
        //return vec4(r3_30i,r5_30i,r7_30i, r2maxi);
        getDistortionAndR2ForCamAsArray: function(numCam){
            
            var arrDistortion = this.getDistortionsPolynomesForCam(numCam);
            var r2max = this.getDistortion_r2max(arrDistortion);
            arrDistortion.push(r2max);
 
            return arrDistortion;
            
        },
        
         getDistortionAndR2ForCamAsVec4: function(numCam){
             
             var arrDistortion = this.getDistortionsPolynomesForCam(numCam);
             var r2max = this.getDistortion_r2max(arrDistortion);
             
             return new THREE.Vector4(arrDistortion[0],arrDistortion[1],arrDistortion[2],r2max);
         },
        
        // Return an array containing all distortions parameters and max for all cam
        // [_r3_300,_r5_300,_r7_300,r2max300,_r3_301,_r5_301,_r7_301,r2max301,...]
        getArrayDistortionAndR2AllCam: function(){
            
            var arrAll = [];
            arrAll.push.apply(arrAll, this.getDistortionAndR2ForCamAsArray(300));
            arrAll.push.apply(arrAll, this.getDistortionAndR2ForCamAsArray(301));
            arrAll.push.apply(arrAll, this.getDistortionAndR2ForCamAsArray(302));
            arrAll.push.apply(arrAll, this.getDistortionAndR2ForCamAsArray(303));
            arrAll.push.apply(arrAll, this.getDistortionAndR2ForCamAsArray(304));
          
            console.log('arrALL',arrAll);
            return arrAll;
        },
        
        

          
          
          getAllMobileMatrices: function(){

            this.getMatricesMobileV1();
            this.getMatricesMobileV2();
          },
          
          
          
          
          getMatricesMobileV1: function(){
              
           _MatCam21  = new THREE.Matrix4
            ().set(
                0.614489, -0.788913, -0.00449825,0,
                -0.788923, -0.614463,-0.00589333,0,
                0.00188532, 0.00717016, -0.999973 , 0,
                0, 0, 0, 1
            );

            _MatCam22 = new THREE.Matrix4
            ().set(
                0.999984, 0.00328995, -0.00458741, 0, 
                0.00326778, -0.999983, -0.00483175, 0, 
                -0.00460323, 0.00481668, -0.999978, 0, 
                0, 0, 0, 1 
            );

            _MatCam23 = new THREE.Matrix4
            ().set(
                0.613172, 0.789904, -0.00852646,0,
                0.789948, -0.613109 , 0.00896955,0,
                0.00185743,-0.0122353, -0.999923,0,
                0, 0, 0, 1
            );

            _MatCam31 = new THREE.Matrix4
            ().set(
                0.00534745, -0.999975, 0.00473252, 0,
                -0.987799, -0.00601883, -0.155619, 0,
               0.155643, -0.00384262, -0.987806,0,
                0, 0, 0, 1
            );


            _MatCam32 = new THREE.Matrix4
            ().set( 
                -0.00135681,-0.999999, -0.000100121,0, 
                -0.57632, 0.000700137, 0.817224 ,0,
               -0.817223, 0.00116652, -0.576321, 0, 
                0, 0, 0, 1
            );

            _MatCam33 = new THREE.Matrix4
            ().set( 
                 -0.00610257, 0.999981, -0.00117247, 0,
                0.568903, 0.00250758, -0.822401 ,	0,
               -0.822382 , -0.00568578, -0.568908, 0,
                0, 0, 0, 1
            );

            _MatCam34 = new THREE.Matrix4
            ().set(
               -0.00545058 , 0.999915,  -0.0118055,0,
                0.988839 , 0.00714723,  0.148818, 0,
                0.14889, -0.0108626, -0.988794, 0,
                0, 0, 0, 1
            );	

            _MatCam41 = new THREE.Matrix4
            ().set(
                -0.61311,  -0.789988, 0.00390962, 0,
               -0.789998,  0.613097,-0.00391649, 0,
                0.000696999, -0.00548983,-0.999985, 0,
                0, 0, 0, 1
            );	

            _MatCam42 = new THREE.Matrix4
            ().set( 
                -0.999994, -0.00278512,-0.00215781 ,0,
                -0.00276952 , 0.99997, -0.00720311, 0,
                0.0021778 , -0.00719709, -0.999972, 0,
                0, 0, 0, 1
            );														 

            _MatCam43 = new THREE.Matrix4
            ().set(
                -0.615967, 0.787764, -0.00357732, 0,
                0.787772, 0.615965, -0.00180358 , 0,
                0.000782711, -0.00392906, -0.999992,0,
                0, 0, 0, 1
            );
            
           // console.log("_MatCam22",_MatCam22);
           // Utils.outputMatrix4(_MatCam22);
       /*         
         _MatCam312 = new THREE.Matrix4().multiplyMatrices(_MatCam31, this.getMatOrientationCapteur(1));
         _MatCam322 = new THREE.Matrix4().multiplyMatrices(_MatCam32, matRotationCam180degZ);
         _MatCam332 = new THREE.Matrix4().multiplyMatrices(_MatCam33, matRotationCam180degZ);
         _MatCam342 = new THREE.Matrix4().multiplyMatrices(_MatCam34, matRotationCam180degZ);
    */
        },
        
       
        // TEST en dur Matrice BC
        getMatricesMobileV2: function(){

           _MatCam300  = new THREE.Matrix4  // looking up the sky
            ().set(   
                0.000735648, 0.999998  ,0.00205156 , 0,
                -0.00148884 ,0.00205265 , -0.999997, 0,
                -0.999999 ,0.000732591 , 0.00149035 , 0,
                0, 0, 0, 1
            );

            _MatCam301 = new THREE.Matrix4  // Axe truck direction
            ().set(
                0.999983 , 0.0057386 , -0.000383448 , 0, 
                0.00573631 , -0.999967 , -0.00572726 , 0, 
                -0.000416302 , 0.00572497 , -0.999984 , 0, 
                0, 0, 0, 1 
            );

            _MatCam302 = new THREE.Matrix4
            ().set(
                -0.000880418 , -0.999978 , -0.00663636 , 0,
                -0.999989 , 0.0008499 , 0.00460009 , 0,
                -0.00459435 , 0.00664034 , -0.999967 , 0,
                 0, 0, 0, 1
            );

            _MatCam303 = new THREE.Matrix4
            ().set(
                -0.999997 , -0.000499298 , 0.00238871, 0,
                -0.000490943 , 0.999994 , 0.00349722 , 0,
                -0.00239044 , 0.00349604 ,-0.999991 , 0,
                0, 0, 0, 1
            );


            _MatCam304 = new THREE.Matrix4
            ().set( 
                0.00374348 , 0.999979 ,-0.0053097 , 0,
                0.999988 , -0.00375951 , -0.00301241 , 0,
                -0.0030323 ,-0.00529837 , -0.999981 , 0,
                0, 0, 0, 1
            );
 
        },
       
    
        // 4 different ori of the capteur
        getMatOrientationCapteur: function(numOri){
         
            var ori0 = new THREE.Matrix4().set( 0,-1, 0, 0,
                                          1, 0, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori1 = new THREE.Matrix4().set( 0, 1, 0, 0,
                                         -1, 0, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori2 = new THREE.Matrix4().set(-1, 0, 0, 0,
                                          0,-1, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);


            var ori3 = new THREE.Matrix4().set( 1, 0, 0, 0,
                                          0, 1, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);

            switch(numOri){

                case 0: return ori0;
                case 1: return ori1;
                case 2: return ori2; 
                case 3: return ori3; 
            }                              

         
       },
     
     
        getAllMobileSommet: function(){
            
           this.getMobileSommetV1();
           this.getMobileSommetV2();
           
        },
        
         
        getMobileSommetV1: function(){
             
            _SomCam21 = new THREE.Vector3( -0.0602755,  -0.0957625 , -0.716335);
            _SomCam22 = new THREE.Vector3( -0.0149244 , -6.96779e-05, -0.717489);
            _SomCam23 = new THREE.Vector3( -0.0603178 , 0.0956123, -0.716402);
            _SomCam31 = new THREE.Vector3( -0.144275 , -0.193849,-0.642124);
            _SomCam32 = new THREE.Vector3( -0.142364, -0.175058, -0.814522);
            _SomCam33 = new THREE.Vector3( -0.143022 , 0.172639,-0.816821);
            _SomCam34 = new THREE.Vector3( -0.144903  , 0.195569, -0.642232);
            _SomCam41 = new THREE.Vector3( -0.228293 , -0.0954342, -0.717044);
            _SomCam42 = new THREE.Vector3( -0.271697 , 0.000427889, -0.717008);
            _SomCam43 = new THREE.Vector3( -0.227154 , 0.0962825, -0.716681 );
             
        },
             
        getMobileSommetV2: function(){
            
            // Get from Mobile for a specific chantier (in DB Soon)
            _SomCam300 = new THREE.Vector3(-0.145711, -0.0008142, -0.867);
            _SomCam301 = new THREE.Vector3(-0.0449668, 0.0620361, -0.865681);
            _SomCam302 = new THREE.Vector3(-0.0856818, -0.102837, -0.866901);
            _SomCam303 = new THREE.Vector3(-0.248471, -0.060197, -0.865218);
        //    _SomCam304 = new THREE.Vector3(-0.207387, 0.0996596, -0.863219);
        // Temp with values like ori.xml from mobile not micmac
        _SomCam304 = new THREE.Vector3(-0.20684,0.10192,-0.86520);
      //  _SomCam304 = new THREE.Vector3(-0.10192,0.86520,0.20684); // As it should be after projection

        },
        
        
        // Change sommet coordinate from applanix repere to itowns
        // Xapplan -> Zitowns , Yapplan -> xitowns , Zapplan -> -Y itowns
        // -> matrice projCoord  
        setAllMobileSommetToItownsRef: function(){
            
            var projCoord = _itownsWay;
       
        // THEN in itowns coordinates
        // OLD is the combination of _itownsWay * coord * rotYPI
            _SomCam300 = _SomCam300.applyProjection(projCoord);
            _SomCam301 = _SomCam301.applyProjection(projCoord);
            _SomCam302 = _SomCam302.applyProjection(projCoord);
            _SomCam303 = _SomCam303.applyProjection(projCoord);
            _SomCam304 = _SomCam304.applyProjection(projCoord);
     /*    
         this.applyItownsProjection(_SomCam300);
         this.applyItownsProjection(_SomCam301);
         this.applyItownsProjection(_SomCam302);
         this.applyItownsProjection(_SomCam303);*/
         //   this.applyItownsProjection(_SomCam304);
         //   _SomCam304 = this.applyItownsProjectionTSAndItowns(_SomCam304,2);
            console.log('_SomCam304 after project: ',_SomCam304);
            
            _SomCam21 = _SomCam21.applyProjection(projCoord);
            _SomCam22 = _SomCam22.applyProjection(projCoord);
            _SomCam23 = _SomCam23.applyProjection(projCoord);
            _SomCam31 = _SomCam31.applyProjection(projCoord);
            _SomCam32 = _SomCam32.applyProjection(projCoord);
            _SomCam33 = _SomCam33.applyProjection(projCoord);
            _SomCam34 = _SomCam34.applyProjection(projCoord);
            _SomCam41 = _SomCam41.applyProjection(projCoord);
            _SomCam42 = _SomCam42.applyProjection(projCoord);
            _SomCam43 = _SomCam43.applyProjection(projCoord);
            
        },
        
        
        //Temp
        applyItownsProjection: function(v3){
            
            var x = v3.x;
            var y = v3.y;
            var z = v3.z;
            
            v3.x =  y;
            v3.y = -z;
            v3.z =  x;    
            
        },
        
        
        //Temp
        applyItownsProjectionTSAndItowns: function(v3,numOri){
           
          var out = new THREE.Matrix4();
       //   out = new THREE.Matrix4().multiplyMatrices( out.clone(), Photogram_JMM.clone() );
          //out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.getMatOrientationCapteur(numOri).clone());
       //   out = new THREE.Matrix4().multiplyMatrices( out.clone(), photgramme_image.clone());
          out = new THREE.Matrix4().multiplyMatrices(_itownsWay, out.clone());  
          
          v3.applyProjection(out);
          return v3;
        },
        
        
        
        getBarycentreV2: function(){

            return new THREE.Vector3(
                  (_SomCam300.x+_SomCam301.x+_SomCam302.x+_SomCam303.x+_SomCam304.x)/5,
                  (_SomCam300.y+_SomCam301.y+_SomCam302.y+_SomCam303.y+_SomCam304.y)/5,
                  (_SomCam300.z+_SomCam301.z+_SomCam302.z+_SomCam303.z+_SomCam304.z)/5
              );

        },
        
         
        getBarycentreV1: function(){
            
            return new THREE.Vector3(
                  (_SomCam21.x+_SomCam22.x+_SomCam23.x+_SomCam31.x+_SomCam32.x+
                  _SomCam33.x+_SomCam34.x+_SomCam41.x+_SomCam42.x+_SomCam43.x)/10,
                 (_SomCam21.y+_SomCam22.y+_SomCam23.y+_SomCam31.y+_SomCam32.y+
                  _SomCam33.y+_SomCam34.y+_SomCam41.y+_SomCam42.y+_SomCam43.y)/10,
                 (_SomCam21.z+_SomCam22.z+_SomCam23.z+_SomCam31.z+_SomCam32.z+
                  _SomCam33.z+_SomCam34.z+_SomCam41.z+_SomCam42.z+_SomCam43.z)/10

              );

        },
        
        
        getSommet: function(num){
            
            switch(num){
                
                case 21:   return _SomCam21;     break;
                case 22:   return _SomCam22;     break;
                case 23:   return _SomCam23;     break;
                case 31:   return _SomCam31;     break;
                case 32:   return _SomCam32;     break;
                case 33:   return _SomCam33;     break;
                case 34:   return _SomCam34;     break;
                case 41:   return _SomCam41;     break;
                case 42:   return _SomCam42;     break;
                case 43:   return _SomCam43;     break;
                
                case 300:  return _SomCam300;    break;
                case 301:  return _SomCam301;    break;
                case 302:  return _SomCam302;    break;
                case 303:  return _SomCam303;    break;
                case 304:  return _SomCam304;    break;
         
            }
        },
        
       // Add the Optical coordinate of the cam in the applanix ref
       setMatriceTranslation: function(mat,num){
            
            switch(num){
                
                case 300:  mat.setPosition(new THREE.Vector3(-0.145711, -0.0008142, -0.867));    break;
                case 301:  mat.setPosition(new THREE.Vector3(-0.0449668, -0.0620361, -0.865681)); break;
                case 302:  mat.setPosition(new THREE.Vector3(-0.0856818, -0.102837, -0.866901)); break;
                case 303:  mat.setPosition(new THREE.Vector3(-0.248471, -0.060197, -0.865218));  break;
                case 304:  mat.setPosition(new THREE.Vector3(-0.207387, 0.0996596, -0.863219));  break;
            }
        },
        
        

     
      // From XStereopolisCam. Compute all the transformation to get local
      getMatOrientationTotal: function(num,numOri){

        

        // C++: m_georefRead.GetRotation() * Photogram_JMM * MatOrientationCapteur () * photgramme_image;
        var out = new THREE.Matrix4();
        
        //out = new THREE.Matrix4().multiplyMatrices( camion2eye_matrix, this.getMatCam(num).clone());
        // out = new THREE.Matrix4().multiplyMatrices( camion2eye_matrix, this.getMatCam(num).clone());
       
        var rotZ180 = new THREE.Matrix4().set(  0, 1, 0, 0,
                                         -1, 0, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1);
                                          
        var rotX180 =   new THREE.Matrix4().set( 1, 0,  0, 0,
                                           0, -1, 0, 0,
                                           0, 0, -1, 0,
                                           0, 0,  0, 1);          
                                           
        var rotY180 =   new THREE.Matrix4().set( -1, 0, 0, 0,
                                           0, 1, 0, 0,
                                           0, 0, -1, 0,
                                           0, 0,  0, 1);      
                                           
                                                                                    
        var rotY90 =   new THREE.Matrix4().set( 0, 0, 1, 0,
                                           0, 1, 0, 0,
                                           -1, 0, 0, 0,
                                           0, 0,  0, 1);    
                                           
        var rotYM90 =   new THREE.Matrix4().set( 0, 0, -1, 0,
                                           0, 1, 0, 0,
                                           1, 0, 0, 0,
                                           0, 0,  0, 1);                                        
                                           
       var rotXM90 =   new THREE.Matrix4().set(  1, 0, 0, 0,
                                           0, 0, 1, 0,
                                           0, -1, 0, 0,
                                           0, 0,  0, 1);
                                           
       var rotX90 =   new THREE.Matrix4().set(   1, 0, 0, 0,
                                           0, 0, -1, 0,
                                           0, 1, 0, 0,
                                           0, 0,  0, 1); 
                                                                                      
       var rotZ90 =   new THREE.Matrix4().set(   0, -1, 0, 0,
                                           1, 0, 0, 0,
                                           0, 0,  1, 0,
                                           0, 0,  0, 1); 
                                           
       var rotZM90 =   new THREE.Matrix4().set(  0, 1, 0, 0,
                                           -1, 0, 0, 0,
                                           0, 0,  1, 0,
                                           0, 0,  0, 1); 
                                           
      var MZ =   new THREE.Matrix4().set(   1, 0,  0, 0,
                                      0, 1,  0, 0,
                                      0, 0, -1, 0,
                                      0, 0,  0, 1);
                                                          
                          
                          
                          
                          
        // C++: m_georefRead.GetRotation() * Photogram_JMM * MatOrientationCapteur () * photgramme_image;
        
        // We swap the Z then we do to rotation rotYM90,rotX90
         //_itownsWay = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().multiplyMatrices(rotYM90,rotXM90),MZ);
  //var _itownsWay = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().multiplyMatrices(rotZM90,rotX90),MZ);

  
  
      //  out = new THREE.Matrix4().multiplyMatrices(_itownsWay, this.getMatCam(num).clone());    
        out = this.getMatCam(num).clone();    
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), Photogram_JMM.clone() );
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), this.getMatOrientationCapteur(numOri).clone());
        out = new THREE.Matrix4().multiplyMatrices( out.clone(), photgramme_image.clone());

        out = new THREE.Matrix4().multiplyMatrices(_itownsWay, out.clone());    

    //    out = new THREE.Matrix4().multiplyMatrices( out.clone(), rotY180);   // !!!

     
        
        return out;
        
      },
      
      
      
      
      setAllMobileMatricesToItownsRef: function(){
          
                    
          //Cam V1_2
          _MatCam312 = this.getMatOrientationTotal(31,1);
          _MatCam322 = this.getMatOrientationTotal(32,1);
          _MatCam332 = this.getMatOrientationTotal(33,1);
          _MatCam342 = this.getMatOrientationTotal(34,1);
          
          //Cam V1
          _MatCam21 = this.getMatOrientationTotal(21,0);
          _MatCam22 = this.getMatOrientationTotal(22,3);
          _MatCam23 = this.getMatOrientationTotal(23,0);
          _MatCam31 = this.getMatOrientationTotal(31,0);
          _MatCam32 = this.getMatOrientationTotal(32,0);
          _MatCam33 = this.getMatOrientationTotal(33,0);
          _MatCam34 = this.getMatOrientationTotal(34,0);
          _MatCam41 = this.getMatOrientationTotal(41,0);
          _MatCam42 = this.getMatOrientationTotal(42,3);
          _MatCam43 = this.getMatOrientationTotal(43,0);

          //Cam V2
          _MatCam300 = this.getMatOrientationTotal(300,3);
          _MatCam301 = this.getMatOrientationTotal(301,2);
          _MatCam302 = this.getMatOrientationTotal(302,2);
          _MatCam303 = this.getMatOrientationTotal(303,2);
          _MatCam304 = this.getMatOrientationTotal(304,2);

      },

/*
        getMatCam2: function(num){

            // Look in the array of sensors for element with a specific cam id position
            
            return $.grep(arraySensors, function(e){ return e.infos.cam_id_pos == num; })[0];

            },
 */

/*
        // Look in the array of sensors for element with a specific cam id position
        getSensorForCamIdPos: function(num){
            
            return $.grep(arraySensors, function(e){ return e.infos.cam_id_pos == num; })[0];
        },
        
 */       
         getMatCam: function(num){
            
            var mat;
            switch(num){
                
                case 21: mat = _MatCam21; break;
                case 22: mat = _MatCam22; break;
                case 23: mat = _MatCam23; break;
                case 31: mat = _MatCam31; break;
                case 32: mat = _MatCam32; break;
                case 33: mat = _MatCam33; break;
                case 34: mat = _MatCam34; break;
                case 41: mat = _MatCam41; break;
                case 42: mat = _MatCam42; break;
                case 43: mat = _MatCam43; break;
                    
                case 300: mat = _MatCam300; break;
                case 301: mat = _MatCam301; break;
                case 302: mat = _MatCam302; break;
                case 303: mat = _MatCam303; break;
                case 304: mat = _MatCam304; break;
                    
                case 312: mat = _MatCam312; break;
                case 322: mat = _MatCam322; break;
                case 332: mat = _MatCam332; break;
                case 342: mat = _MatCam342; break;
                                    
                    
            }
            return mat;
        }
        
        
        
    
    };
     
     
    return Ori
    
  }
)
         