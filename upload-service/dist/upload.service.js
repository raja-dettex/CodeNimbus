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
exports.cloneAndUpload = void 0;
const simple_git_1 = require("simple-git");
const git = (0, simple_git_1.simpleGit)();
const path_1 = __importDefault(require("path"));
const minio_1 = require("minio");
const ioredis_1 = __importDefault(require("ioredis"));
const pub = new ioredis_1.default('rediss://default:ASj-AAIjcDEyZjk1MjI0ZDdkNWE0NWRmOWNkZTk1YzgxNzRjYzE4YnAxMA@logical-snipe-10494.upstash.io:6379');
pub.on('error', (err) => console.log('Redis Client Error', err));
const minioClient = new minio_1.Client({
    endPoint: 'bucket-production-3109.up.railway.app',
    port: 443,
    useSSL: true,
    accessKey: 'GQecgVpCr7MfAeFaNDhi',
    secretKey: 'vNGvYavOdUuUE7Mg14G5uaAIuFa35pr8LOBEhqF0'
});
function generateRandomString() {
    let subset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * subset.length);
        randomString += subset[randomIndex];
    }
    return randomString;
}
const fs_1 = __importDefault(require("fs"));
function getFilesFromFilepath(basePath, filepath) {
    const files = fs_1.default.readdirSync(filepath);
    const fileStrings = [];
    for (const file of files) {
        if (file === '.git')
            continue;
        const fullPath = path_1.default.join(filepath, file);
        if (fs_1.default.statSync(fullPath).isDirectory()) {
            fileStrings.push(...getFilesFromFilepath(basePath, fullPath));
        }
        else {
            const relPath = path_1.default.relative(basePath, fullPath);
            fileStrings.push({ filePath: fullPath, relPath });
        }
    }
    return fileStrings;
}
const cloneAndUpload = (repoUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const id = generateRandomString();
    try {
        const res = yield git.clone(repoUrl, path_1.default.join(__dirname, id), ['--depth', '1'], (err) => console.log(err));
        const files = getFilesFromFilepath(path_1.default.join(__dirname, id), path_1.default.join(__dirname, id));
        for (const { filePath, relPath } of files) {
            const uploadInfo = yield minioClient.fPutObject('uploads', `/${id}/${relPath}`, filePath);
        }
        const published = yield pub.rpush('build-queue', id);
        console.log(published);
        return id;
    }
    catch (err) {
        console.log("err", err);
        return null;
    }
});
exports.cloneAndUpload = cloneAndUpload;
