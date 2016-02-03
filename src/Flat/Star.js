/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

define('Globe/Star',['Renderer/NodeMesh','StarGeometry'], function(NodeMesh,StarGeometry){
  
   
    var  Star = function (){
        
        
        NodeMesh.call( this );
        
        var geom = new THREE.StarGeometry();
        
        var particles = new THREE.Points( geom, new THREE.PointsMaterial( { color: 0xAAAACC } ) );
        this.add( particles );
       
    };

    Star.prototype = Object.create( NodeMesh.prototype );

    Star.prototype.constructor = Star;
    
 
    return Star;
    
});
