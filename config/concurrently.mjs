import concurrently from 'concurrently';

import fs from 'fs';

const pck = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const script = process.argv[2];

concurrently(pck.workspaces.map(workspace => ({
    command: `npm run ${script} -w ${workspace} --if-present`,
    name: `${workspace}`,
})));

