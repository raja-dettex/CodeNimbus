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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const minio_1 = require("minio");
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = __importDefault(require("fs"));
const events_1 = __importDefault(require("events"));
const os_1 = require("os");
const worker_threads_1 = require("worker_threads");
const numCpus = (0, os_1.cpus)().length - 2;
console.log(numCpus);
// function extractKeyFromReferrer(req: express.Request): string | null {
//     const referer = req.get('referer'); // e.g. http://localhost:8080/peLe0/some-page
//     if (!referer) return null;
//     const match = referer.match(/\/([a-zA-Z0-9]+)\//); // extract the first path segment
//     return match ? match[1] : null;
// }
const redisSubscriber = new ioredis_1.default('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379');
redisSubscriber.on('error', (err) => console.log('Redis Client Error', err));
const minioClient = new minio_1.Client({
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
});
const emitter = new events_1.default();
// download builds and pass to worker threads
function downloadBuilds() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        while (true) {
            const key = yield redisSubscriber.rpop('deploy-queue');
            //console.log(key)
            if (key === null)
                continue;
            console.log(key);
            const objects = minioClient.listObjectsV2('builds', key, true);
            const downloadPromises = [];
            try {
                for (var _d = true, objects_1 = (e_1 = void 0, __asyncValues(objects)), objects_1_1; objects_1_1 = yield objects_1.next(), _a = objects_1_1.done, !_a; _d = true) {
                    _c = objects_1_1.value;
                    _d = false;
                    const obj = _c;
                    if (!obj.name)
                        continue;
                    const localPath = path_1.default.join(__dirname, obj.name);
                    const localDir = path_1.default.dirname(localPath);
                    if (!fs_1.default.existsSync(localDir)) {
                        fs_1.default.mkdirSync(localDir, { recursive: true });
                    }
                    const writeStream = fs_1.default.createWriteStream(localPath);
                    const objectStream = yield minioClient.getObject('builds', obj.name);
                    downloadPromises.push((0, promises_1.pipeline)(objectStream, writeStream));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = objects_1.return)) yield _b.call(objects_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            console.log('awaiting all promises');
            yield Promise.all(downloadPromises);
            console.log('emitting');
            emitter.emit('downloads', key);
            console.log('emitted');
        }
    });
}
const ports = [8080, 8081];
let index = 0;
function getDynamicPort() {
    const port = ports[index];
    if (index == 1)
        index = 0;
    else
        index = 1;
    return port;
}
emitter.on('downloads', (key) => {
    const worker = new worker_threads_1.Worker(path_1.default.resolve(path_1.default.join(__dirname, 'pull-builds-worker.js')), { workerData: { key, port: getDynamicPort() } });
    console.log(worker);
    worker.on('message', (data) => console.log(data));
    worker.on('error', (err) => console.log(err));
    worker.on('exit', () => console.log('exited worker thread'));
});
downloadBuilds();
