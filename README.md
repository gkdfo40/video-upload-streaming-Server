# 📼Video-upload-streaming (Server)

 + [Project](#project)
 + [Dependency](#dependency)
 + [Routes](#routes)
 + [Controller](#controller)

<br/>

## Project

[video-upload-streaming](https://github.com/gkdfo40/video-upload-streaming) 의 비디오 송출을 위한 server.

클라이언트에 Video Stream을 전송한다. 이때 DB에 저장된 Video 파일을 서버 Memory에 모두 적재하면 서버의 메모리 부족으로 인한 다운을 예상할 수 있다. 그래서 서버는 클라이언트에서 GridFS형식으로 분할하여 DB에 저장한 Video Chunks 파일을 필요할 때마다 전송한다. chunk파일은 3MB(255kbtyes까지 가능)이며 서버에서는 파일 전체를 전송할 필요 없이 필요한 부분만 Memory에 적재하여 전송하면 된다. 

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
    
    // DB에 저장된 시청 가능한 Video 목록을 생성한다. 
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
