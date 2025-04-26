import express from 'express'
import cors from 'cors'
import path from 'path'
import {pipeline} from 'stream/promises'
import { Client } from 'minio';
import Redis from 'ioredis'
import fs from 'fs'
import EventEmitter from 'events';
import cluster from 'cluster'
import { cpus } from 'os';
import {Worker } from 'worker_threads'
const numCpus = cpus().length - 2;
console.log(numCpus);



// function extractKeyFromReferrer(req: express.Request): string | null {
//     const referer = req.get('referer'); // e.g. http://localhost:8080/peLe0/some-page
//     if (!referer) return null;
    
//     const match = referer.match(/\/([a-zA-Z0-9]+)\//); // extract the first path segment
//     return match ? match[1] : null;
// }



const redisSubscriber = new Redis('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379'
);
redisSubscriber.on('error', (err) => console.log('Redis Client Error', err));

const minioClient = new Client({ 
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
})
const emitter = new EventEmitter()
// download builds and pass to worker threads
async function downloadBuilds() {
    while(true) { 
        const key = await redisSubscriber.rpop('deploy-queue')
        //console.log(key)
        if(key === null) continue
        console.log(key)
        const objects = minioClient.listObjectsV2('builds', key, true)
        const downloadPromises : Promise<void>[] = []
        for await (const obj of objects) { 
            if(!obj.name) continue
            const localPath = path.join(__dirname, obj.name)
            const localDir = path.dirname(localPath)
            if(!fs.existsSync(localDir)) { 
                fs.mkdirSync(localDir, { recursive: true})
            }
            const writeStream = fs.createWriteStream(localPath)
            const objectStream = await minioClient.getObject('builds', obj.name)
            downloadPromises.push(pipeline(objectStream, writeStream))
            
        }
        console.log('awaiting all promises')
        await Promise.all(downloadPromises)
        console.log('emitting')
        emitter.emit('downloads', key)
        console.log('emitted')
    } 
}
const ports = [8080, 8081]
let index = 0;
function getDynamicPort() { 
    const port = ports[index]
    if(index == 1) index = 0
    else index = 1
    return port
    
}

emitter.on('downloads', (key) => { 
    const worker = new Worker(path.resolve(path.join(__dirname, 'pull-builds-worker.js')), { workerData: { key, port: getDynamicPort()}})
    console.log(worker)
    worker.on('message' , (data) => console.log(data))
    worker.on('error', (err ) => console.log(err))
    worker.on('exit', () => console.log('exited worker thread'))
})



downloadBuilds()