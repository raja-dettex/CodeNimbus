import { NextRequest, NextResponse} from 'next/server'
import axios, { AxiosError } from 'axios'
export const POST = async (req: NextRequest) => { 
    const data = await req.json()
    if(!data.title  || !data.body || !data.userId) {
        NextResponse.json({
            message: "not a valid request body"
        }, { status: 400})
        return
    }
    try { 
        const res = await axios.post('https://jsonplaceholder.typicode.com/posts' , {...data}, { 
            headers: { 
                "Content-Type" : 'application/json; utf-8'
            }
        }) 
        return NextResponse.json({...res.data, title: data.title, body: data.body, userId: data.userId}, {status: 201})
    } catch(error) { 
        if(error instanceof AxiosError) return NextResponse.json(error.response)
    }
}

export const GET = async (req: NextRequest) => { 
    
    try { 
        const res = await axios.get('https://jsonplaceholder.typicode.com/posts') 
        return NextResponse.json({posts: res.data}, {status: 201})
    } catch(error) { 
        if(error instanceof AxiosError) return NextResponse.json(error.response)
    }
}


