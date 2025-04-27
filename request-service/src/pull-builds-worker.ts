import express , {Request,  Response } from 'express'
import {parentPort,  workerData} from 'worker_threads'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import next from 'next'
import { NodeNextRequest, NodeNextResponse} from 'next/dist/server/base-http/node'
import {IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'
const { key, port, public_url } = workerData;
process.env.NEXT_PUBLIC_URL=public_url;

console.log('public url ', process.env.NEXT_PUBLIC_URL)
console.log(key, port)
const app = express()
app.use(cors())
//app.use(express.json())
const buildDir = path.join(__dirname , key, '.next')
const staticDir = path.join(buildDir, 'static')
const serverAppDir = path.join(buildDir, 'server', 'app')
const prerenderManifest = JSON.parse(fs.readFileSync(path.join(buildDir, 
    'prerender-manifest.json'
), 'utf-8') )
const routesManifest = JSON.parse(fs.readFileSync(path.join(buildDir, 
    'routes-manifest.json'
), 'utf-8') )
app.use(`/_next/static`, express.static(staticDir, {
    immutable: true,
    maxAge: '1y',
}));
app.use(`/_next/data`, express.static(path.join(serverAppDir, '_next', 'data')));


// serve ssg pages 

const buffetToStream = (buffer: Buffer ) => { 
    return new Readable({
        read() { 
            this.push(buffer)
            this.push(null)
        }
    })
}
const nextApp = next({dev: false, dir: path.join(__dirname, key)});
const handler = nextApp.getRequestHandler()
nextApp.prepare().then(() => { 
    for(const [route, data] of Object.entries(prerenderManifest.routes)) { 
        console.log('route ', route, ' data: ' , data)
        
        
        app.get(`${route}`, async (req, res) => {
            //@ts-ignore
            // const htmlFile = path.join(serverAppDir, data.dataRoute.replace(".rsc", ".html").replace("/", ""));
            // let html = fs.readFileSync(htmlFile, 'utf-8');
            // res.setHeader('Content-Type', 'text/html; charset=utf-8');
            // res.send(html);
            //req.url = req.url.replace(`/${key}`, '')
            await handler(req, res)
        });
    }
    app.all(`/api/:route`, async (req, res) => {
        console.log('here')
        // if(req.method === 'GET') { 
        //     console.log("here")
        //     const route = req.path;
            
        //     console.log(route)
        //     const routePath = path.join(serverAppDir, route.replace(`/${key}/`, ""), 'route.js')
        //     console.log(routePath)
        //     if(fs.existsSync(routePath)) { 
        //         console.log('exists')
        //         const routeModule = await import(routePath)
        //         console.log("route module ", routeModule)
        //         routeModule.render(req, res)
        //     }    
        // }
        //req.url = req.url.replace(`/${key}`, '');
        
        await handler(req, res)
        
    })
})
//handle ssr requests

app.listen(port, () => console.log('Listening to port 8080'))
