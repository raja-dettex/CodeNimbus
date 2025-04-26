import { simpleGit} from 'simple-git'
const git = simpleGit();
import path from 'path'
import { Client } from 'minio';
import Redis from 'ioredis'
const pub = new Redis('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379'
);
pub.on('error', (err) => console.log('Redis Client Error', err));

const minioClient = new Client({ 
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
})

function generateRandomString() { 
    let subset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let randomString = ''
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * subset.length);
        randomString += subset[randomIndex];
    }
    return randomString;

} 


import fs from 'fs'

function getFilesFromFilepath(basePath: string, filepath: string) {

    const files = fs.readdirSync(filepath)
    const fileStrings : {filePath: string, relPath: string}[] = []
    for(const file of files) { 
        if (file === '.git') continue;
        const fullPath = path.join(filepath, file);
        if(fs.statSync(fullPath).isDirectory()) { 
            fileStrings.push(...getFilesFromFilepath(basePath, fullPath))
        }
        else {
            
            const relPath = path.relative(basePath, fullPath)
   
            fileStrings.push({filePath: fullPath, relPath})
        }
    }
    return fileStrings;
}



export const cloneAndUpload = async (repoUrl: string) => { 
    const id = generateRandomString();
    try { 
        const res =  await git.clone(repoUrl, path.join(__dirname, id), ['--depth', '1'], (err) => console.log(err))
        const files = getFilesFromFilepath(path.join(__dirname, id), path.join(__dirname, id))
        for(const {filePath, relPath} of files) {
                const uploadInfo = await minioClient.fPutObject('uploads', `/${id}/${relPath}`, filePath)
        }
        const published = await pub.rpush('build-queue', id)
        console.log(published)
        return id;
    } catch(err) { 
        console.log("err" , err)
        return null;
    }
}