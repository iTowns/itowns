import { OrthoLayer } from '../Layers/OrthoLayer';
import { IgnMntLayer } from '../Layers/IgnMntLayer';
import { IgnMntHighResLayer } from '../Layers/IgnMntHighResLayer';
import { ParksLayer } from '../Layers/ParksLayer';
import { FlatBuildingsLayer } from '../Layers/FlatBuildingsLayer';
import { BuildingsLayer3D } from '../Layers/BuildingsLayer3D';
import { TreesLayer } from '../Layers/TreesLayer';

export const LayerRepository = {
    orthoLayer: OrthoLayer,
    ignMntLayer: IgnMntLayer,
    ignMntHighResLayer: IgnMntHighResLayer,
    parksLayer: ParksLayer,
    flatBuildingsLayer: FlatBuildingsLayer,
    buildingsLayer3D: BuildingsLayer3D,
    treesLayer: TreesLayer,
};
