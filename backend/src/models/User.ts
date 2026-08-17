import mongoose from 'mongoose'

export type UserDocument = {
  _id: mongoose.Types.ObjectId
  email: string
  passwordHash: string
  createdAt: Date
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const User = mongoose.model<UserDocument>('User', userSchema)
