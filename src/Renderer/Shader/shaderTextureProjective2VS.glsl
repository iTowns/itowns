
    #ifdef GL_ES
    precision  highp float;
    #endif

    // Those uniforms are 
    // ModelView * Projection * rotation of the rigid sys (Stereopolis)

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
 
    uniform vec4 factorTranslation0;	
    uniform vec4 factorTranslation1;
    uniform vec4 factorTranslation2;
    uniform vec4 factorTranslation3;
    uniform vec4 factorTranslation4;
    uniform vec4 factorTranslation0bis;
    uniform vec4 factorTranslation1bis;
    uniform vec4 factorTranslation2bis;
    uniform vec4 factorTranslation3bis;
    uniform vec4 factorTranslation4bis;

    uniform int mobileOn;


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

    vec4 pos;



    void main() {

        pos =  vec4(position,1.);

        if(mobileOn==0){
            v_texcoord0 =  mvpp_current_0 * (pos- factorTranslation0);
            v_texcoord1 =  mvpp_current_1 * (pos- factorTranslation1);
            v_texcoord2 =  mvpp_current_2 * (pos- factorTranslation2);
            v_texcoord3 =  mvpp_current_3 * (pos- factorTranslation3);
            v_texcoord4 =  mvpp_current_4 * (pos- factorTranslation4);
        }

        v_texcoord0bis =  mvpp_current_0bis * (pos- factorTranslation0bis);
        v_texcoord1bis =  mvpp_current_1bis * (pos- factorTranslation1bis);
        v_texcoord2bis =  mvpp_current_2bis * (pos- factorTranslation2bis);
        v_texcoord3bis =  mvpp_current_3bis * (pos- factorTranslation3bis);
        v_texcoord4bis =  mvpp_current_4bis * (pos- factorTranslation4bis);

        gl_Position  =  projectionMatrix *  modelViewMatrix * pos;

    }
