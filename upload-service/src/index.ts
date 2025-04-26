import express from 'express';
import cors from 'cors';            
import { simpleGit} from 'simple-git';
import path from 'path'
import { cloneAndUpload } from './upload.service'
const app = express();


app.use(cors())
app.use(express.json());



app.post('/api/upload', async (req, res)=> { 
    const { repoUrl} = req.body;
    const id = await cloneAndUpload(repoUrl)
    if(!id) { 
        res.status(500).json({ error: 'Failed to clone and upload repository' })
        return;
    }
    res.json({ id})
    return;
})



app.listen(3000, () => { console.log("listening on port 3000")})