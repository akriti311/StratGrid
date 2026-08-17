import mongoose from 'mongoose'

export const VENUES = ['lighter', 'backpack', 'hyperliquid'] as const
export type Venue = (typeof VENUES)[number]

export type CredentialDocument = {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  venue: Venue
  ciphertext: string
  createdAt: Date
  updatedAt: Date
}

const credentialSchema = new mongoose.Schema<CredentialDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: { type: String, required: true, enum: VENUES },
    ciphertext: { type: String, required: true },
  },
  { timestamps: true },
)

credentialSchema.index({ userId: 1, venue: 1 }, { unique: true })

export const Credential = mongoose.model<CredentialDocument>(
  'Credential',
  credentialSchema,
)
