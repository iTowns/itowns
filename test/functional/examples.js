/* View */
require('./view/view_2d_map');
require('./view/view_25d_map');
require('./view/view_3d_map');
require('./view/view_multiglobe');
require('./view/view_multi_25d');
// require('./view/view_immersive');
// require('./view/view_3d_mns_map');

/* Geoid */
// require('./geoid/geoid_geoidLayer');

/* 3d Tiles */
require('./3dTiles/3dtiles_basic');
require('./3dTiles/3dtiles_25d');
require('./3dTiles/3dtiles_batch_table');
require('./3dTiles/3dtiles_ion');
require('./3dTiles/3dtiles_pointcloud');

/* Pointcloud */
require('./pointCloud/potree_25d_map');
require('./pointCloud/potree_3d_map');
// require('./pointCloud/laz_dragndrop');
// require('./pointCloud/entwine_simple_loader');
// require('./pointCloud/entwine_3d_loader');

/* Vector tiles */
require('./vectorTiles/vector_tile_raster_3d');
require('./vectorTiles/vector_tile_raster_2d');
// require('./vectorTiles/vector_tile_3d_mesh');
require('./vectorTiles/vector_tile_3d_mesh_mapbox');
// require('./vectorTiles/vector_tile_dragndrop');

/* WFS source */
require('./wfsSource/source_stream_wfs_25d');
require('./wfsSource/source_stream_wfs_3d');
require('./wfsSource/source_stream_wfs_raster');

/* Specific source options */
// require('./speSourceOptions/source_file_from_format');
// require('./speSourceOptions/source_file_from_methods');

/* FileSource */
require('./fileSource/source_file_geojson_raster');
// require('./fileSource/source_file_geojson_raster_usgs');
// require('./fileSource/source_file_geojson_3d');
require('./fileSource/source_file_kml_raster');
require('./fileSource/source_file_kml_raster_usgs');
// require('./fileSource/source_file_gpx_raster');
require('./fileSource/source_file_gpx_3d');

/* Customize FileSource */
// require('./customFileSource/source_file_from_fetched_data');
// require('./customFileSource/source_file_from_parsed_data');
// require('./customFileSource/source_file_shapefile');

/* Effects */
require('./effect/effects_postprocessing');
require('./effect/effects_split');
require('./effect/effects_stereo');
// require('./effect/mars');
// require('./effect/customColorLayerEffect');

/* Miscellaneous */
require('./misc/misc_colorlayer_visibility');
require('./misc/misc_collada');
require('./misc/misc_clamp_ground');
// require('./misc/misc_camera_animation');
// require('./misc/misc_compare_25d_3d');
require('./misc/misc_georeferenced_images');
// require('./misc/misc_orthographic_camera');
// require('./misc/misc_custom_controls');
// require('./misc/misc_custom_label');
// require('./misc/misc_camera_traveling');
require('./misc/misc_instancing');

/* Widgets */
// require('./widget/widgets_navigation');
// require('./widget/widgets_minimap');
// require('./widget/widgets_scale');
// require('./widget/widgets_searchbar');
require('./widget/widgets_3dtiles_style');

/* Plugins */
// require('./plugin/plugins_drag_n_drop');
// require('./plugin/plugins_pyramidal_tiff');
// require('./plugin/plugins_vrt');
