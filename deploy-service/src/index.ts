import Redis from 'ioredis'
import { Client} from 'minio'
import path from 'path';
import fs from 'fs'

const sub = new Redis('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379'
);
sub.on('error', (err) => console.log('Redis Client Error', err));

const minioClient = new Client({ 
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
})

async function deploy() { 
    while(true) { 
        const id = await sub.rpop('build-queue')
        if(id) { 
            await downloadFromBucket(id)
            let childProcess = build(path.join(__dirname , id))
            childProcess.on('close', async () => { 
                await uploadBuildsToBucket(id)
            })
            
        }
    } 
}

import { pipeline } from 'stream/promises';

export async function downloadFromBucket(id: string) {
    const bucketStream = minioClient.listObjectsV2('uploads', `${id}`, true);
    const downloadPromises: Promise<void>[] = [];
  
    for await (const obj of bucketStream) {
      if (!obj.name) continue;
    console.log(obj.name)
      const localPath = path.join(__dirname, obj.name);
      const localDir = path.dirname(localPath);
  
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
  
      const fileWriteStream = fs.createWriteStream(localPath);
      const objectStream = await minioClient.getObject('uploads', obj.name);
  
      // Push download to array
      downloadPromises.push(pipeline(objectStream, fileWriteStream));
    }
  
    await Promise.all(downloadPromises);

}

import {exec} from 'node:child_process'
function build(basepath: String) {
    console.log(basepath)
    let process = exec(`cd ${basepath} && npm install && npm run build`, (err, stdout, stderr) => { 
        if(err != null) console.log(err)
        if(stdout  !== null) console.log(stdout)
        if(stderr != null) console.log(stderr)
    }) 
    return process
    
}
function getObjectsPath(basepath: string, fullpath: string) { 
    
    const files = fs.readdirSync(fullpath);
    const fileString : {filepath: string, relpath: string}[] = []
    for (const file of files) { 
        if(file === '.git') continue
        if(file === 'cache') continue
        const fullPath = path.join(fullpath, file)
        if(!fs.existsSync(fullPath)) continue
        if(fs.statSync(fullPath).isDirectory()) { 
            fileString.push(...getObjectsPath(basepath, fullPath))
        } else { 
            fileString.push({ filepath: fullPath, relpath: path.relative(basepath, fullPath)})
        }
    }
    return fileString
}
async function uploadBuildsToBucket(key: string) {
    const basepath = path.join(__dirname, key, '.next')
    const objects = getObjectsPath(basepath, basepath)
    console.log(objects.length)
    for(const obj of objects) {
        console.log(obj) 
        const uploadInfo = await minioClient.fPutObject('builds', path.join(key, '.next', obj.relpath), obj.filepath)
        console.log(uploadInfo)
             
    }
    sub.rpush('deploy-queue', key)
}

deploy()