// import * as itowns from 'itowns';

// export const Scene4 = {
//     placement: {
//         coord: { long: 2.351323, lat: 48.856712 },
//         range: 2000,
//         tilt: 45,
//         heading: 0,
//     },
//     layers: [],
//     scaler: function update(/* dt */) {
//         if (Scene4.meshes.length) {
//             for (let i = 0; i < Scene4.meshes.length; i++) {
//                 const mesh = Scene4.meshes[i];
//                 if (mesh && mesh.scale.z < 1) {
//                     mesh.scale.z = Math.min(1.0, mesh.scale.z + 0.005);
//                     mesh.updateMatrixWorld(true);
//                 }
//             }
//             Scene4.meshes = Scene4.meshes.filter(m => m.scale.z < 1);
//         }
//     },
//     onEnter: (view) => {
//         const func = () => {
//             view.notifyChange(view.camera3D, true);
//             Scene4.scaler();
//             view.notifyChange(view.camera3D, true);
//         };
//         view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, func);
//     },
//     onExit: (view) => {
//         const func = () => {
//             view.notifyChange(view.camera3D, true);
//             Scene4.scaler();
//             view.notifyChange(view.camera3D, true);
//         };
//         view.removeFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, func);
//     },
//     extrusion_height: 0,
//     meshes: [],
// };

// const buildingsSource = new itowns.VectorTilesSource({
//     style: 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
//     filter: layer => layer['source-layer'].includes('bati_surf')
//             && layer.paint['fill-color'],
// });

// const buildingsLayer = new itowns.FeatureGeometryLayer('VTBuilding', {
//     source: buildingsSource,
//     zoom: { min: 15 },
//     onMeshCreated: function scaleZ(mesh) {
//         mesh.children.forEach((c) => {
//             c.scale.z = 0.01;
//             Scene4.meshes.push(c);
//         });
//     },
//     accurate: false,
//     style: {
//         fill: {
//             base_altitude: p => p.alti_sol || 0,
//             extrusion_height: p => p.hauteur || 0,
//         },
//     },
// });

// Scene4.layers.push(buildingsLayer);
