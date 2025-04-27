"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const worker_threads_1 = require("worker_threads");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const next_1 = __importDefault(require("next"));
const stream_1 = require("stream");
const { key, port, public_url } = worker_threads_1.workerData;
process.env.NEXT_PUBLIC_URL = public_url;
console.log('public url ', process.env.NEXT_PUBLIC_URL);
console.log(key, port);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
//app.use(express.json())
const buildDir = path_1.default.join(__dirname, key, '.next');
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
const buffetToStream = (buffer) => {
    return new stream_1.Readable({
        read() {
            this.push(buffer);
            this.push(null);
        }
    });
};
const nextApp = (0, next_1.default)({ dev: false, dir: path_1.default.join(__dirname, key) });
const handler = nextApp.getRequestHandler();
nextApp.prepare().then(() => {
    for (const [route, data] of Object.entries(prerenderManifest.routes)) {
        console.log('route ', route, ' data: ', data);
        app.get(`${route}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
            //@ts-ignore
            // const htmlFile = path.join(serverAppDir, data.dataRoute.replace(".rsc", ".html").replace("/", ""));
            // let html = fs.readFileSync(htmlFile, 'utf-8');
            // res.setHeader('Content-Type', 'text/html; charset=utf-8');
            // res.send(html);
            //req.url = req.url.replace(`/${key}`, '')
            yield handler(req, res);
        }));
    }
    app.all(`/api/:route`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('here');
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
        yield handler(req, res);
    }));
});
//handle ssr requests
app.listen(port, () => console.log('Listening to port 8080'));
