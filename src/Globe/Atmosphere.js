/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Globe/Atmosphere',['Renderer/NodeMesh','THREE','text!Renderer/Shader/GlowPS.glsl','text!Renderer/Shader/GlowVS.glsl'], function(NodeMesh,THREE,GlowPS,GlowVS){

    function Atmosphere(){
        
        NodeMesh.call( this );
        
        this.material = new THREE.ShaderMaterial( {
	
            vertexShader    : GlowVS,
            fragmentShader  : GlowPS,
            side            : THREE.BackSide,
            blending        : THREE.AdditiveBlending,
            transparent     : true

        } );
                
        this.geometry = new THREE.SphereGeometry( 7.3, 64, 64 );
        
        this.add(new THREE.Mesh(new THREE.SphereGeometry(6.3, 32, 32 ), new THREE.MeshBasicMaterial({color : 0x4B683A})));
        
    }
    
    Atmosphere.prototype = Object.create( NodeMesh.prototype );
    
    Atmosphere.prototype.constructor = Atmosphere;

    return Atmosphere;

});