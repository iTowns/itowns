
        #ifdef GL_ES 
        precision highp float;
        #endif

        uniform float alpha;

        uniform mat4 mvpp_current_0;
        uniform mat4 mvpp_current_1;
        uniform mat4 mvpp_current_2;
        uniform mat4 mvpp_current_3;
        uniform mat4 mvpp_current_4;
        uniform mat4 mvpp_current_0bis;
        uniform mat4 mvpp_current_1bis;
        uniform mat4 mvpp_current_2bis;
        uniform mat4 mvpp_current_3bis;
        uniform mat4 mvpp_current_4bis;

        uniform sampler2D   texture0;
        uniform sampler2D   texture1;
        uniform sampler2D   texture2;
        uniform sampler2D   texture3;
        uniform sampler2D   texture4;
        uniform sampler2D   texture0bis;
        uniform sampler2D   texture1bis;
        uniform sampler2D   texture2bis;
        uniform sampler2D   texture3bis;
        uniform sampler2D   texture4bis;
        uniform sampler2D   textureFrontMask;
        uniform sampler2D   textureBackMask;

        uniform vec4 factorTranslation;	
        uniform vec4 factorTranslationbis;

        varying vec4 v_texcoord0;
        varying vec4 v_texcoord1;
        varying vec4 v_texcoord2;
        varying vec4 v_texcoord3;
        varying vec4 v_texcoord4;
        varying vec4 v_texcoord0bis;
        varying vec4 v_texcoord1bis;
        varying vec4 v_texcoord2bis;
        varying vec4 v_texcoord3bis;
        varying vec4 v_texcoord4bis;

        uniform float indice_time0;
        uniform float indice_time1;
        uniform float indice_time2;
        uniform float indice_time3;
        uniform float indice_time4;

        uniform vec4 intrinsic300;
        uniform vec4 intrinsic301;
        uniform vec4 intrinsic302;
        uniform vec4 intrinsic303;
        uniform vec4 intrinsic304;
        

        uniform int blendingOn;
        uniform int mobileOn;
        uniform int fog;

        float width = 2048.0;
        float height = 2048.0;
        float dist;


        // Distortion
        float cpps = 1042.178;
        float lpps = 1020.435;
        vec2 pps = vec2(cpps,lpps);

        vec4 color = vec4(0.,0.,0.,0.);	
        vec4 colorbis = vec4(0.,0.,0.,0.);
        vec4 saveColor = vec4(0.,0.,0.,0.);

        vec2 corrected0, corrected1,corrected2,corrected3,corrected4;
        vec2 corrected0bis, corrected1bis,corrected2bis,corrected3bis,corrected4bis;



        // Function to correct coordinate using 3rd degree polynome and max
       vec2 correctDistortionAndCoord(vec4 dist, vec4 v_texcoord){
            
            vec2 v = v_texcoord.xy/v_texcoord.w - pps;
            float v2 = dot(v,v);
            if(v2>dist.w) return vec2(-2.,-2.); // false;
            float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
            vec2 normCoord = v_texcoord.xy/(v_texcoord.w) + r*v;
                //float r = v2*(dist.x+v2*(dist.y+v2*dist.z));
                //vec2 normCoord = v_texcoord.xy + r*v*v_texcoord.w;

            return vec2(normCoord.x/width , 1. - normCoord.y/height); 

        }



        void main(void)
        {	
            bool blending = (blendingOn == 1) && (mobileOn==0);

            // FIRSTLY the previous position for nice transition

            if(mobileOn==0){    // If not on light config we compute the rendering for previous pano 

                    corrected0 = correctDistortionAndCoord(intrinsic300, v_texcoord0);

                    if ((corrected0.x>=0. && corrected0.x<=1. && corrected0.y>=0. && corrected0.y<=1.) && v_texcoord0.w>0.)
                         color = texture2D(texture0,corrected0); 
                    else{

                        corrected1 = correctDistortionAndCoord(intrinsic301, v_texcoord1);

                        if ((corrected1.x>=0. && corrected1.x<=1. && corrected1.y>=0. && corrected1.y<=1.) && v_texcoord1.w>0.){
                         color = texture2D(texture1,corrected1); 
                         color.a = 1. - texture2D(textureFrontMask,corrected1).a;
                        }
                        else{

                            corrected2 = correctDistortionAndCoord(intrinsic302, v_texcoord2);

                            if ((corrected2.x>=0. && corrected2.x<=1. && corrected2.y>=0. && corrected2.y<=1.) && v_texcoord2.w>0.)
                               color = texture2D(texture2,corrected2); 
                             else{



                                corrected3 = correctDistortionAndCoord(intrinsic303, v_texcoord3);


                                if ((corrected3.x>=0. && corrected3.x<=1. && corrected3.y>=0. && corrected3.y<=1.) && v_texcoord3.w>0.){
                                        color = texture2D(texture3,corrected3); 
                                        color.a = 1. - texture2D(textureBackMask,corrected3).a;
                                }
                                else{

                                    corrected4 = correctDistortionAndCoord(intrinsic304, v_texcoord4);

                                    if ((corrected4.x>=0. && corrected4.x<=1. && corrected4.y>=0. && corrected4.y<=1.) && v_texcoord4.w>0.)
                                                    color = texture2D(texture4,corrected4); 
                                }
                            }
                        }
                    }
            }
            saveColor = color;


// SECONDLY 
        
   
            corrected0bis = correctDistortionAndCoord(intrinsic300, v_texcoord0bis);
            corrected1bis = correctDistortionAndCoord(intrinsic301, v_texcoord1bis);
            corrected2bis = correctDistortionAndCoord(intrinsic302, v_texcoord2bis);
            corrected3bis = correctDistortionAndCoord(intrinsic303, v_texcoord3bis);
            corrected4bis = correctDistortionAndCoord(intrinsic304, v_texcoord4bis);


// CAM 0,300

            if ((corrected0bis.x>0. && corrected0bis.x<1. && corrected0bis.y>0. && corrected0bis.y<1.) && v_texcoord0bis.w>0.){

                colorbis = texture2D(texture0bis,corrected0bis);
                
                if(blending){   
                    // Blending cam0/cam1
                    if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ 
                        colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);
                    }
                    // Blending cam0/cam2
                    if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected0bis.y >0.97){ 
                        colorbis = colorbis *  (1. - (corrected0bis.y-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected0bis.y-0.97)/0.03);
                    }
                    // Blending cam0/cam3
                     if (((corrected3bis.x>0. && corrected3bis.x<1. && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.)&& corrected0bis.x > 0.97){ 
                        colorbis = colorbis *  (1. - (corrected0bis.x-0.97)/0.03)   +   texture2D(texture3bis,corrected3bis) * ((corrected0bis.x-0.97)/0.03);
                    }
                    // Blending cam0/cam4
                     if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected0bis.y < 0.03){ 
                        colorbis = colorbis *  (corrected0bis.y/0.03)  +   texture2D(texture4bis,corrected4bis) * ( 1. - corrected0bis.y/0.03);
                    }
                      if (((corrected1bis.x>=0. && corrected1bis.x<=1. && corrected1bis.y>=0. && corrected1bis.y<=1.) && v_texcoord1bis.w>0.)&& corrected0bis.x < 0.03){ 
                        colorbis = colorbis * (corrected0bis.x/ 0.03) +   texture2D(texture1bis,corrected1bis) * (1.- (corrected0bis.x)/ 0.03);         
                    }
                }
                                 
                //color = indice_time0 * saveColor + (1. - indice_time0) * colorbis; //indice_time21
                color = indice_time0 * (saveColor - colorbis) + colorbis;
            }else


// CAM 1,301

             if ((corrected1bis.x>0. && corrected1bis.x<1. && corrected1bis.y>0. && corrected1bis.y<1.) && v_texcoord1bis.w>0.){

                       colorbis =  texture2D(texture1bis,corrected1bis);
                       colorbis.a = 1.- texture2D(textureFrontMask,corrected1bis).a;

                       if(blending){
                           // Blending cam1/cam2
                           if (((corrected2bis.x>=0. && corrected2bis.x<=1. && corrected2bis.y>=0. && corrected2bis.y<=1.) && v_texcoord2bis.w>0.)&& corrected1bis.x> .97){ 
                               colorbis = colorbis * (1. - (corrected1bis.x-0.97)/0.03)  +   texture2D(texture2bis,corrected2bis) * ((corrected1bis.x-0.97)/0.03);
                           }
                           // Blending cam1/cam4
                           if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected1bis.x< 0.03){ 
                               colorbis = colorbis * (corrected1bis.x/0.03)  +   texture2D(texture4bis,corrected4bis) * (1.- (corrected1bis.x)/0.03);
                           }
                       }

                       color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis;
                       color.a = colorbis.a + saveColor.a;
                       //color = indice_time1 * saveColor + (1. - indice_time1) * color;
                       color = indice_time1 * (saveColor - color) + color;

            }else



// CAM 2,302

            if ((corrected2bis.x>0. && corrected2bis.x<1. && corrected2bis.y>0. && corrected2bis.y<1.) && v_texcoord2bis.w>0.){
               
                   colorbis = texture2D(texture2bis,corrected2bis);
                if(blending){
                     // Blending cam2/cam3
                     if (((corrected3bis.x>=0. && corrected3bis.x<=1. && corrected3bis.y>=0. && corrected3bis.y<=1.) && v_texcoord3bis.w>0.)&& corrected2bis.x>0.97){ 
                         colorbis = colorbis * (1. - (corrected2bis.x-0.97)/0.03)  +   texture2D(texture3bis,corrected3bis) * ((corrected2bis.x-0.97)/0.03);
                     }
                }

                //  BLEND with ground
                if(corrected2bis.y>0.97) colorbis = colorbis * (1. - (corrected2bis.y-0.97)/0.03) + saveColor * ((corrected2bis.y-0.97)/0.03);

                //color = indice_time2 * saveColor + (1. - indice_time2) * colorbis; 	
                  color = indice_time2 * (saveColor - colorbis) + colorbis;
                    
            }else

// CAM 3,303

            if ((corrected3bis.x>0.01 && corrected3bis.x<0.99 && corrected3bis.y>0. && corrected3bis.y<1.) && v_texcoord3bis.w>0.){
             
                   colorbis = texture2D(texture3bis,corrected3bis);
                   colorbis.a = 1.- texture2D(textureBackMask,corrected3bis).a;

                    // Blending cam3/cam4
                    if(blending){
                        if (((corrected4bis.x>=0. && corrected4bis.x<=1. && corrected4bis.y>=0. && corrected4bis.y<=1.) && v_texcoord4bis.w>0.)&& corrected3bis.x>0.97){ 
                            colorbis = colorbis * (1. - (corrected3bis.x-0.97)/0.03)   +   texture2D(texture4bis,corrected4bis) * ((corrected3bis.x-0.97)/0.03);
                        }
                    }
                    
                    color = (1. - colorbis.a) * saveColor + colorbis.a * colorbis;
                    color.a = colorbis.a + saveColor.a;
                    //color = indice_time3 * saveColor + (1. - indice_time3) * color;
                    color = indice_time3 * (saveColor - color) + color;

                }else

// CAM 4,304

            if ((corrected4bis.x>0. && corrected4bis.x<1. && corrected4bis.y>0. && corrected4bis.y<1.) && v_texcoord4bis.w>0.){

                colorbis = texture2D(texture4bis,corrected4bis);	

                //  BLEND with ground
                if(corrected4bis.y>0.97) colorbis = colorbis * (1. - (corrected4bis.y-0.97)/0.03) + saveColor * ((corrected4bis.y-0.97)/0.03);

                //color = indice_time4 * saveColor + (1. - indice_time4) * colorbis; 
                  color = indice_time4 * (saveColor - colorbis) + colorbis;
            }

            color.a = alpha;
            gl_FragColor = color;

    }
