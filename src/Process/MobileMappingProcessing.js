import Fetcher from 'Core/Commander/Providers/Fetcher';
import * as THREE from 'three';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import MatteIdsMaterial from 'Renderer/MatteIdsMaterial';
import GlobeDepthMaterial from 'Renderer/GlobeDepthMaterial';
import ProjectiveTexturingMaterial from 'Renderer/ProjectiveTexturingMaterial';
import PanoramaControls from 'Renderer/ThreeExtended/PanoramaControls';
import { multiplyMatrices3x3 } from 'MobileMapping/Sensor';

let metadatas;
let jsonPromise;
let spheres;
let lastActiveSphere;

let sensors = [];

function buildSensor(big) {
    const geometry = new THREE.SphereGeometry(0.10, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const s = new THREE.Mesh(geometry, material);
    s.material.visible = false;
    const a = new THREE.AxisHelper( big ? 2 : 1 );

    s.add(a);
    return s;

}
export function mobileMappingPreUpdate(context, layer) {
    if (metadatas) {
        if (!spheres) {
            spheres = [];
            for (const p of metadatas) {
                const geometry = new THREE.SphereGeometry(1, 32, 32);
                const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.panoInfo = p;
                sphere.materials = [];
                sphere.materials.push(material);
                sphere.materials.push(new GlobeDepthMaterial());
                sphere.materials.push(new MatteIdsMaterial());
                sphere.materials[1].uniforms.useRTC = false;
                sphere.materials[2].uniforms.uuid.value = sphere.id;
                sphere.materials[2].uniforms.useRTC = false;

                sphere.changeState = function(state) {
                    this.material = this.materials[state];
                }

                const geo = new GeoCoordinate(p.longitude, p.latitude, p.altitude, UNIT.DEGREE);
                sphere.position.copy(layer.ellipsoid.cartographicToCartesian(geo));
                sphere.updateMatrix();
                sphere.updateMatrixWorld();
                spheres.push(sphere);
                context.scene.gfxEngine.scene3D.add(sphere);

                if (p.filename.indexOf('0000492') >= 0) {
                    lastActiveSphere = sphere;

                    let xx = new THREE.AxisHelper(3);
                    sphere.add(xx);

                    const m3 = ProjectiveTexturingMaterial.getCameraFrameRotation(p);
                    const m4 = new THREE.Matrix4();
                    m4.elements[0] = m3.elements[0];
                    m4.elements[1] = m3.elements[1];
                    m4.elements[2] = m3.elements[2];

                    m4.elements[4] = m3.elements[3];
                    m4.elements[5] = m3.elements[4];
                    m4.elements[6] = m3.elements[5];

                    m4.elements[8] = m3.elements[6];
                    m4.elements[9] = m3.elements[7];
                    m4.elements[10] = m3.elements[8];

                    sphere.setRotationFromMatrix(m4);

                    sphere.updateMatrix();
                    sphere.updateMatrixWorld();
                    xx.updateMatrixWorld();

                    for (var i=0; i<5; i++) {
                        let s = buildSensor(i == 1);
                        sensors.push(s);
                        sphere.add(s);

                        if (i == 1) {
                            s.material.color = new THREE.Color(0xff0000);
                        } else if (i==-1) { //} || i==2 || i==4) {
                            s.visible = false;
                            s.frustumCulled = false;
                        }
                    }

                    console.log('ACTIVE PANO ID', sphere.id);
                } else {
                    sphere.material.visible = false;
                }
            }
            // context.scene.gfxEngine.scene3D.add(spheres);
        } else {
            const blue = new THREE.Color(0x0000ff);
            const yellow = new THREE.Color(0xffff00);
            for (const c of spheres) {
                if (c.selected) {
                    lastActiveSphere = c;
                }
                c.materials[0].color = (lastActiveSphere && lastActiveSphere.id == c.id) ? blue : yellow;
            }

        }
        return;
    }
    if (jsonPromise) {
        return;
    }

    jsonPromise = Fetcher.json(layer.url).then((result) => {
        metadatas = result;
    });
}

let materialPromise;
export function mobileMappingUpdate(context, layer, element) {
    if (!lastActiveSphere) {
        return;
    }

    for (const c of element.children) {
        if (c.selected) {
            if (materialPromise) {
                return;
            }

            const panoInfo = lastActiveSphere.panoInfo;
            const pivot = element.position;

            const options = {
                url : "{lod}/images/{YYMMDD2}/Paris-{YYMMDD2}_0740-{cam.cam}-00001_{splitIt}.jpg",
                cam: '/dist/itowns-sample-data/cameraCalibration.json',
                lods : ['/dist/itowns-sample-data'],

                YYMMDD2 : function() {  //"filename":"Paris-140616_0740-00-00001_0000500"
                     // console.log(this);
                     return this.pano.filename.match("-(.*?)_")[1];
                },
                splitIt : function(){
                    return this.pano.filename.split("_")[2];
                },
                YYMMDD : function() {
                    var d = new Date(this.pano.date);
                    return (""+d.getUTCFullYear()).slice(-2) + ("0"+(d.getUTCMonth()+1)).slice(-2) + ("0" + d.getUTCDate()).slice(-2);
                },
                UTCOffset : 15,
                seconds : function() {
                    var d = new Date(this.pano.date);
                    return (d.getUTCHours()*60 + d.getUTCMinutes())*60+d.getUTCSeconds()-this.UTCOffset;
                },
                visible: true

            };



            var globe;
            // enablePano();
            function enableGlobe() {
                context.scene.controls.enabled = false;
                let n = lastActiveSphere.position.clone();
                n.normalize();
                n.multiplyScalar(20);
                context.camera.camera3D.position.copy(lastActiveSphere.position.clone().add(n));
                context.camera.camera3D.lookAt(lastActiveSphere.position);
                globe = true;
            }

            function enablePano() {
                context.scene.controls.enabled = false;
                context.camera.camera3D.near = 0.1;
                context.camera.camera3D.far = 1000;
                context.camera.camera3D.updateProjectionMatrix();
                context.camera.camera3D.fov = 60;
                context.camera.FOV = 60;
                context.scene.controls = new PanoramaControls(context.scene,
                    context.camera.camera3D, context.scene.gfxEngine.renderer.domElement);
                context.camera.camera3D.position.copy(lastActiveSphere.position);
                context.camera.camera3D.updateMatrix();
                globe = false;
            }

            window.addEventListener('keyup', (event) => {
                if (event.keyCode == 17) {
                    if (globe) enablePano();
                    else enableGlobe();
                }
            }, false);




            // context.camera.camera3D.lookAt(element.position);
            lastActiveSphere.material.visible = false;
            console.log("SPHERE POSITION: ", lastActiveSphere.position);
            materialPromise = ProjectiveTexturingMaterial.init(options, panoInfo, pivot).then((mat) => {
                var posPanoWGS84 = new GeoCoordinate(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude, UNIT.DEGREE);

                const worldFrameRotation = mat.matRotationFrame;

                // place sensors
                for (let i=0; i<5; i++) {
                    let p = mat.sensors[i].position;
                    p.applyMatrix3(worldFrameRotation);
                    sensors[i].position.copy(p);//posPanoCartesian.clone().add(p));
                    const rotation = mat.sensors[i].rotation; // new THREE.Matrix3();
                    // multiplyMatrices3x3(worldFrameRotation, mat.sensors[i].rotation, rotation);
                    const m4 = new THREE.Matrix4();
                    m4.elements[0] = rotation.elements[0];
                    m4.elements[1] = rotation.elements[1];
                    m4.elements[2] = rotation.elements[2];

                    m4.elements[4] = rotation.elements[3];
                    m4.elements[5] = rotation.elements[4];
                    m4.elements[6] = rotation.elements[5];

                    m4.elements[8] = rotation.elements[6];
                    m4.elements[9] = rotation.elements[7];
                    m4.elements[10] = rotation.elements[8];


                    sensors[i].setRotationFromMatrix(m4);

                    sensors[i].updateMatrix();
                    sensors[i].updateMatrixWorld();
                }


                c.materials[0] = mat.shader;
                c.material = c.materials[0];
                c.material.needsUpdate = true;
                context.scene.gfxEngine.screenCoordsToNodeId({x: 0, y: 0});
                console.log('Material set');
                context.scene.notifyChange();
                context.scene.gfxEngine.screenCoordsToNodeId({x: 0, y: 0});
                context.scene.notifyChange();
            });
        }

    }
}
