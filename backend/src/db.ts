import mongoose from 'mongoose'
import { config } from './config'

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 })
    console.log(`MongoDB connected at ${config.mongoUri}`)
    return
  } catch {
    console.warn(
      'Local MongoDB is not running. Starting an in-memory database for development.',
    )
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const memory = await MongoMemoryServer.create()
  const uri = memory.getUri('stratgrid')
  await mongoose.connect(uri)
  console.log(`In-memory MongoDB connected at ${uri}`)
}
