import { Express } from 'express'
import { getStreamVideoHandler, getPostsList } from './controller/video.controller'
export default function routes(app: Express) {
    app.get('/api/videos/file', getStreamVideoHandler)
    app.get('/api/videos/posts', getPostsList)
}