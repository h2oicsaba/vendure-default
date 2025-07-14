import { bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';

// Explicit worker mód beállítása
process.env.WORKER_MODE = 'true';

console.log('Starting Vendure worker with explicit WORKER_MODE=true');

bootstrapWorker(config)
    .then(worker => worker.startJobQueue())
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
