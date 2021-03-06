# ๐ผVideo-upload-streaming (Server)

 + [Project](#project)
 + [Dependency](#dependency)
 + [Routes](#routes)
 + [Controller](#controller)

<br/>

## Project

[video-upload-streaming](https://github.com/gkdfo40/video-upload-streaming) ์ ๋น๋์ค ์ก์ถ์ ์ํ server.

ํด๋ผ์ด์ธํธ์ Video Stream์ ์ ์กํ๋ค. ์ด๋ DB์ ์ ์ฅ๋ Video ํ์ผ์ ์๋ฒ Memory์ ๋ชจ๋ ์ ์ฌํ๋ฉด ์๋ฒ์ ๋ฉ๋ชจ๋ฆฌ ๋ถ์กฑ์ผ๋ก ์ธํ ๋ค์ด์ ์์ํ  ์ ์๋ค. ๊ทธ๋์ ์๋ฒ๋ ํด๋ผ์ด์ธํธ์์ GridFSํ์์ผ๋ก ๋ถํ ํ์ฌ DB์ ์ ์ฅํ Video Chunks ํ์ผ์ ํ์ํ  ๋๋ง๋ค ์ ์กํ๋ค. chunkํ์ผ์ 3MB(255kbtyes๊น์ง ๊ฐ๋ฅ)์ด๋ฉฐ ์๋ฒ์์๋ ํ์ผ ์ ์ฒด๋ฅผ ์ ์กํ  ํ์ ์์ด ํ์ํ ๋ถ๋ถ๋ง Memory์ ์ ์ฌํ์ฌ ์ ์กํ๋ฉด ๋๋ค. 

<img src="https://miro.medium.com/max/1400/1*YfqSOOJEM8RYmY8uYm9u0g.png" width="70%" height="70%">

<br/>

## Dependency

[mongodb](https://www.npmjs.com/package/mongodb)

[express](https://www.npmjs.com/package/express)

[ts-node](https://www.npmjs.com/package/ts-node)

[config](https://www.npmjs.com/package/config)


`yarn add typescript mongodb express @types/express ts-node @types/node @types/config config `

`package.json`

```json
"scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts"
  }
```

<br/>

## Routes

```typescript
import { Express } from 'express'
import { getStreamVideoHandler, getPostsList } from './controller/video.controller'

export default function routes(app: Express) {
    app.get('/api/videos/file', getStreamVideoHandler)
    
    // DB์ ์ ์ฅ๋ ์์ฒญ ๊ฐ๋ฅํ Video ๋ชฉ๋ก์ ์์ฑํ๋ค. 
    app.get('/api/videos/posts', getPostsList)
}
```

<br/>

## Controller

 + getPostsList

 ```typescript
 export async function getPostsList(req: Request, res: Response) {
    try {
        await client.connect()
        const db = client.db('videos')
        const metadatas = await db.collection('fs.files').find().toArray();
        res.status(200).json(metadatas);
    } catch (error: any) {
        console.log(error.message);
        res.status(400).end();
    } finally {
        return;
    }
}
 ```

<br/>

 + getStreamVideoHandler

 ```typescript
 export async function getStreamVideoHandler(req: Request, res: Response) {
    try {
        const range = req.headers.range
        if (range) {
            const videoId = req.query.videoId;
            await client.connect()
            const db: Db = client.db('videos')

            const video = await db.collection('fs.files').findOne({ filename: videoId })

            const videoSize = video?.length
            const chunkStart = Number(range?.replace(/\D/g, ""))
            const chunkEnd = Math.min(chunkStart + CHUNK_SIZE_IN_BYTES, videoSize - 1)

            const contentLength = chunkEnd - chunkStart + 1
            const headers = {
                "Content-Range": `bytes ${chunkStart}-${chunkEnd}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
            }

            res.writeHead(206, headers)

            const bucket: GridFSBucket = new GridFSBucket(db)
            const downloadStream = bucket.openDownloadStreamByName(`${videoId}`, {
                start: chunkStart,
                end: chunkEnd,
            })
            downloadStream.pipe(res);

        } else {
            res.status(400).send("Requires Range headers")
        }
    } catch (error: any) {
        console.log(error.message);
        return res.status(500).json(error.message)
    } finally {
        return;
    }
}
 ```
