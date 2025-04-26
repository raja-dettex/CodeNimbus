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
exports.downloadFromBucket = downloadFromBucket;
const ioredis_1 = __importDefault(require("ioredis"));
const minio_1 = require("minio");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sub = new ioredis_1.default('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379');
sub.on('error', (err) => console.log('Redis Client Error', err));
const minioClient = new minio_1.Client({
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
});
function deploy() {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            const id = yield sub.rpop('build-queue');
            if (id) {
                yield downloadFromBucket(id);
                let childProcess = build(path_1.default.join(__dirname, id));
                childProcess.on('close', () => __awaiter(this, void 0, void 0, function* () {
                    yield uploadBuildsToBucket(id);
                }));
            }
        }
    });
}
const promises_1 = require("stream/promises");
function downloadFromBucket(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        const bucketStream = minioClient.listObjectsV2('uploads', `${id}`, true);
        const downloadPromises = [];
        try {
            for (var _d = true, bucketStream_1 = __asyncValues(bucketStream), bucketStream_1_1; bucketStream_1_1 = yield bucketStream_1.next(), _a = bucketStream_1_1.done, !_a; _d = true) {
                _c = bucketStream_1_1.value;
                _d = false;
                const obj = _c;
                if (!obj.name)
                    continue;
                console.log(obj.name);
                const localPath = path_1.default.join(__dirname, obj.name);
                const localDir = path_1.default.dirname(localPath);
                if (!fs_1.default.existsSync(localDir)) {
                    fs_1.default.mkdirSync(localDir, { recursive: true });
                }
                const fileWriteStream = fs_1.default.createWriteStream(localPath);
                const objectStream = yield minioClient.getObject('uploads', obj.name);
                // Push download to array
                downloadPromises.push((0, promises_1.pipeline)(objectStream, fileWriteStream));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = bucketStream_1.return)) yield _b.call(bucketStream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        yield Promise.all(downloadPromises);
    });
}
const node_child_process_1 = require("node:child_process");
function build(basepath) {
    console.log(basepath);
    let process = (0, node_child_process_1.exec)(`cd ${basepath} && npm install && npm run build`, (err, stdout, stderr) => {
        if (err != null)
            console.log(err);
        if (stdout !== null)
            console.log(stdout);
        if (stderr != null)
            console.log(stderr);
    });
    return process;
}
function getObjectsPath(basepath, fullpath) {
    const files = fs_1.default.readdirSync(fullpath);
    const fileString = [];
    for (const file of files) {
        if (file === '.git')
            continue;
        const fullPath = path_1.default.join(fullpath, file);
        if (!fs_1.default.existsSync(fullPath))
            continue;
        if (fs_1.default.statSync(fullPath).isDirectory()) {
            fileString.push(...getObjectsPath(basepath, fullPath));
        }
        else {
            fileString.push({ filepath: fullPath, relpath: path_1.default.relative(basepath, fullPath) });
        }
    }
    return fileString;
}
function uploadBuildsToBucket(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const basepath = path_1.default.join(__dirname, key, '.next');
        const objects = getObjectsPath(basepath, basepath);
        console.log(objects.length);
        for (const obj of objects) {
            console.log(obj);
            const uploadInfo = yield minioClient.fPutObject('builds', path_1.default.join(key, obj.relpath), obj.filepath);
            console.log(uploadInfo);
        }
        sub.rpush('deploy-queue', key);
    });
}
deploy();
