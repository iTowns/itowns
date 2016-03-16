/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Globe/Atmosphere', ['Renderer/NodeMesh', 'THREE', 'Renderer/c3DEngine','Renderer/Shader/skyFS.glsl',
    'Renderer/Shader/skyVS.glsl','Renderer/Shader/groundFS.glsl', 'Renderer/Shader/groundVS.glsl'
    ,'Renderer/Shader/GlowFS.glsl', 'Renderer/Shader/GlowVS.glsl'],
     function(NodeMesh, THREE, gfxEngine, skyFS, skyVS, groundFS, groundVS, GlowFS, GlowVS) {

    function Atmosphere(size) {

        NodeMesh.call(this);

        this.realistic = false;

       
        this.uniformsOut = {
            atmoIN: {
                type: "i",
                value: 0
            }
        };

       var material = new THREE.ShaderMaterial({

            uniforms: this.uniformsOut,
            vertexShader: GlowVS,
            fragmentShader: GlowFS,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            wireframe: false

        });

        var geometry = (new THREE.SphereGeometry(1.14 , 128, 128)).scale(size.x, size.y, size.z);


        this.geometry = geometry;
        this.material = material;

        //this.atmosphereOUT    = new THREE.Mesh(geometry,material);
        //this.add(this.atmosphereOUT);

        this.uniformsIn = {
            atmoIN: {
                type: "i",
                value: 1
            }
        };

        var materialAtmoIn = new THREE.ShaderMaterial({

            uniforms: this.uniformsIn,
            vertexShader: GlowVS,
            fragmentShader: GlowFS,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true

        });

        this.atmosphereIN    = new THREE.Mesh((new THREE.SphereGeometry( 1.002, 64, 64 )).scale(size.x, size.y, size.z),materialAtmoIn);

        this.add(this.atmosphereIN);

        var atmosphere = {
          Kr: 0.0025,
          Km: 0.0010,
          ESun: 20.0,
          g: -0.950,
          innerRadius: 6400000,
          outerRadius: 6700000,
          wavelength: [0.650, 0.570, 0.475],
          scaleDepth: 0.25,
          mieScaleDepth: 0.1
        };
        

        var uniforms = {
          v3LightPosition: {
            type: "v3",
            value: new THREE.Vector3(-0.5, 0, 1).normalize() 
          },
          v3InvWavelength: {
            type: "v3",
            value: new THREE.Vector3(1 / Math.pow(atmosphere.wavelength[0], 4), 1 / Math.pow(atmosphere.wavelength[1], 4), 1 / Math.pow(atmosphere.wavelength[2], 4))
          },
          fCameraHeight: {
            type: "f",
            value: 0.
          },
          fCameraHeight2: {
            type: "f",
            value: 0.
          },
          fInnerRadius: {
            type: "f",
            value: atmosphere.innerRadius
          },
          fInnerRadius2: {
            type: "f",
            value: atmosphere.innerRadius * atmosphere.innerRadius
          },
          fOuterRadius: {
            type: "f",
            value: atmosphere.outerRadius
          },
          fOuterRadius2: {
            type: "f",
            value: atmosphere.outerRadius * atmosphere.outerRadius
          },
          fKrESun: {
            type: "f",
            value: atmosphere.Kr * atmosphere.ESun
          },
          fKmESun: {
            type: "f",
            value: atmosphere.Km * atmosphere.ESun
          },
          fKr4PI: {
            type: "f",
            value: atmosphere.Kr * 4.0 * Math.PI
          },
          fKm4PI: {
            type: "f",
            value: atmosphere.Km * 4.0 * Math.PI
          },
          fScale: {
            type: "f",
            value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius)
          },
          fScaleDepth: {
            type: "f",
            value: atmosphere.scaleDepth
          },
          fScaleOverScaleDepth: {
            type: "f",
            value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) / atmosphere.scaleDepth
          },
          g: {
            type: "f",
            value: atmosphere.g
          },
          g2: {
            type: "f",
            value: atmosphere.g * atmosphere.g
          },
          nSamples: {
            type: "i",
            value: 3
          },
          fSamples: {
            type: "f",
            value: 3.0
          },

          tDisplacement: {
            type: "t",
            value: 0
          },
          tSkyboxDiffuse: {
            type: "t",
            value: 0
          },
          fNightScale: {
            type: "f",
            value: 1
          }
        };
        
        this.ground = {
            geometry: new THREE.SphereGeometry(atmosphere.innerRadius, 50, 50),
            material: new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: groundVS,
            fragmentShader: groundFS ,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false,
            depthWrite: false 
          })
        };
        
        this.ground.mesh = new THREE.Mesh(this.ground.geometry, this.ground.material);
        
        this.sky = {
          geometry: new THREE.SphereGeometry(atmosphere.outerRadius, 196, 196),
          material: new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: skyVS,
            fragmentShader: skyFS
          })
        };

        this.sky.mesh = new THREE.Mesh(this.sky.geometry, this.sky.material);
        this.sky.material.side = THREE.BackSide;
        this.sky.material.transparent = true;
                
        this.ground.mesh.visible = false;
        this.sky.mesh.visible = false;
        this.add(this.ground.mesh);
        this.add(this.sky.mesh);

    }

    Atmosphere.prototype = Object.create(NodeMesh.prototype);
    Atmosphere.prototype.constructor = Atmosphere;
    
    Atmosphere.prototype.setRealisticOn = function(bool){
        
        this.realistic = bool;
        this.atmosphereOUT.visible = !this.realistic;
        this.atmosphereIN.visible  = !this.realistic;
        this.ground.mesh.visible   = this.realistic;
        this.sky.mesh.visible      = this.realistic; 
    };
    

    return Atmosphere;

});
