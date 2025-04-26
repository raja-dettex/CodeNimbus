import express from 'express'
import {parentPort,  workerData} from 'worker_threads'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
const { key, port } = workerData;
console.log(key, port)
const app = express()
app.use(cors())
app.use(express.json())
const buildDir = path.join(__dirname , key)
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
for(const [route, data] of Object.entries(prerenderManifest.routes)) { 
    console.log('route ', route, ' data: ' , data)
    
    
    app.get(`/${key}${route}`, (req, res) => {
        //@ts-ignore
        const htmlFile = path.join(serverAppDir, data.dataRoute.replace(".rsc", ".html").replace("/", ""));
        let html = fs.readFileSync(htmlFile, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    });
}
app.listen(port, () => console.log('Listening to port 8080'))
//handle ssr requests
// app.get("*", async (req, res) => { 
//     const route = req.path;
//     const routePath = path.join(serverAppDir, route, 'route.js')
//     if(fs.existsSync(routePath)) { 
//         const routeModule = await import(routePath)
//         console.log(routeModule)
//         routeModule.render(req, res)
//     }
// })