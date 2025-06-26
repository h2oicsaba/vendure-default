import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './railway-config';

runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        console.log(err);
    });