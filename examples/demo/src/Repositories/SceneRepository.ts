import { Globe3dScene } from '../Scenes/Globe3dScene';
import { Terrain3dScene } from '../Scenes/Terrain3D';
import { ProjectedData2dScene } from '../Scenes/ProjectedData2dScene';
import { ImmersiveViewScene  } from '../Scenes/ImmersiveViewScene';
import { ExtrudedData3dScene  } from '../Scenes/ExtrudedData3dScene';
import { PointCloudScene  } from '../Scenes/PointCloudScene';
import { InstancedDataScene } from '../Scenes/InstancedDataScene';
import { TexturedMeshes3dScene } from '../Scenes/TexturedMeshes3dScene';
import { PlanarViewScene } from '../Scenes/PlanarViewScene';
import { BIMScene } from '../Scenes/BIMScene';

export const SceneRepository = [
    Globe3dScene,
    Terrain3dScene,
    ProjectedData2dScene,
    ExtrudedData3dScene,
    InstancedDataScene,
    PointCloudScene,
    BIMScene,
    TexturedMeshes3dScene,
    ImmersiveViewScene,
    PlanarViewScene,
];
