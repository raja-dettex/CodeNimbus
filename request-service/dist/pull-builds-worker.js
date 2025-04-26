"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const worker_threads_1 = require("worker_threads");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const { key, port } = worker_threads_1.workerData;
console.log(key, port);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const buildDir = path_1.default.join(__dirname, key);
const staticDir = path_1.default.join(buildDir, 'static');
const serverAppDir = path_1.default.join(buildDir, 'server', 'app');
const prerenderManifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(buildDir, 'prerender-manifest.json'), 'utf-8'));
const routesManifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(buildDir, 'routes-manifest.json'), 'utf-8'));
app.use(`/_next/static`, express_1.default.static(staticDir, {
    immutable: true,
    maxAge: '1y',
}));
app.use(`/_next/data`, express_1.default.static(path_1.default.join(serverAppDir, '_next', 'data')));
// serve ssg pages 
for (const [route, data] of Object.entries(prerenderManifest.routes)) {
    console.log('route ', route, ' data: ', data);
    app.get(`/${key}${route}`, (req, res) => {
        //@ts-ignore
        const htmlFile = path_1.default.join(serverAppDir, data.dataRoute.replace(".rsc", ".html").replace("/", ""));
        let html = fs_1.default.readFileSync(htmlFile, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    });
}
app.listen(port, () => console.log('Listening to port 8080'));
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
