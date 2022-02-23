import { Request, Response } from 'express'
import { MongoClient, GridFSBucket, Db, Document } from 'mongodb'
import config from 'config'


const dbUri = config.get<string>('dbUri')
const CHUNK_SIZE_IN_BYTES = 1000000
const client: MongoClient = new MongoClient(dbUri)

export async function getStreamVideoHandler(req: Request, res: Response) {
    try {
        const range = req.headers.range
        if (!range) res.status(400).send("Requires Range headers")

        //const bb: Busboy = busboy({ headers: req.headers })
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

    } catch (error: any) {
        console.log(error.message);
        return res.status(500).json(error.message)
    } finally {
        return;
    }
}

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