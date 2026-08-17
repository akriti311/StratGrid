import mongoose from 'mongoose'

export type DemoPriceDocument = {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  symbol: string
  price: number
  createdAt: Date
  updatedAt: Date
}

const demoPriceSchema = new mongoose.Schema<DemoPriceDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    symbol: { type: String, required: true, default: 'SOL' },
    price: { type: Number, required: true },
  },
  { timestamps: true },
)

demoPriceSchema.index({ userId: 1, symbol: 1 }, { unique: true })

export const DemoPrice = mongoose.model<DemoPriceDocument>(
  'DemoPrice',
  demoPriceSchema,
)
