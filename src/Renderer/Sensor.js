
/**
* @author AD IGN
* Class where we get the Intrinseque parameters of the system. Camera (laser soon).
* load configuration from DB (t_camera INNER JOIN tl_stereopolis_capteurs )
*/


define ('Sensor',['THREE'], function (THREE) { 

    
     
    function Sensor(infos){
                 
        this.sommet = new THREE.Vector3(); 
        this.mat3d =  new THREE.Matrix4(); // new matrix for faster Transform 

        // ALL JSON FROM DB
        this.infos = infos || { cam_calibration_date: "2008-03-04",
                                cam_cppa: 956.866,
                                cam_disto_cpps: 952.15,
                                cam_disto_lpps: 545.721,
                                cam_disto_r3: -4.56769e-8,
                                cam_disto_r5: 2.68315e-14,
                                cam_disto_r7: 1.82166e-21,
                                cam_focal: 1398.27,
                                cam_height: 1080,
                                cam_id: 13,
                                cam_id_pos: 12,
                                cam_lppa: 544.682,
                                cam_name: "Pike_64",
                                cam_orientation: 3,
                                cam_pixel_size: 0.0000074,
                                cam_serial_number: 268927064,
                                cam_width: 1920,
                                l_s_c_cam_id: 13,
                                l_s_c_l1_x: 0.968579,
                                l_s_c_l1_y: 0.0198464,
                                l_s_c_l1_z: 0.247914,
                                l_s_c_l2_x: 0.0182161,
                                l_s_c_l2_y: -0.999795,
                                l_s_c_l2_z: 0.00886795,
                                l_s_c_l3_x: 0.248039,
                                l_s_c_l3_y: -0.00407329,
                                l_s_c_l3_z: -0.968741,
                                l_s_c_las_id: 0,
                                l_s_c_ste_id: 1,
                                l_s_c_x: 1.41298,
                                l_s_c_y: 0.83044,
                                l_s_c_z: 0.14798};
                    
     };   
     
     
     // Compute matrix for faster Transform after
     Sensor.prototype.setMatrix = function(){
         
         var i = this.infos;
         this.mat3d = new THREE.Matrix4( i.l_s_c_l1_x, i.l_s_c_l1_y, i.l_s_c_l1_z,
                                         i.l_s_c_l2_x, i.l_s_c_l2_y, i.l_s_c_l2_z,
                                         i.l_s_c_l3_x, i.l_s_c_l3_y, i.l_s_c_l3_z
                                        );
                                           
     };
     
     
     Sensor.prototype.setSommet= function(){
         
         var i = this.infos;
         this.sommet = new THREE.Vector3( i.l_s_c_x, i.l_s_c_y, i.l_s_c_z);
                                            
     };
     
     
     Sensor.prototype.transformToItownsRef= function(){
         
     };
     
     
     Sensor.prototype.getAllInfos = function(){
         
         
     };

   
     Sensor.prototype.setId = function(id) {
         this.id = id;
     };
     
     
     Sensor.prototype.setName = function(name) {
         this.name = name;
     };
     

    return Sensor


});