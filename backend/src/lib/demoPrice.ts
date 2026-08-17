import { DemoPrice } from '../models/DemoPrice'

export const DEFAULT_SOL_PRICE = 148
export const SOL_SYMBOL = 'SOL'

export async function getSolPrice(userId: string): Promise<number> {
  const doc = await DemoPrice.findOne({ userId, symbol: SOL_SYMBOL })
  return doc?.price ?? DEFAULT_SOL_PRICE
}

export async function setSolPrice(
  userId: string,
  price: number,
): Promise<{ symbol: string; price: number; updatedAt: string }> {
  const doc = await DemoPrice.findOneAndUpdate(
    { userId, symbol: SOL_SYMBOL },
    { $set: { price, symbol: SOL_SYMBOL } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  if (!doc) {
    throw new Error('Could not save demo SOL price')
  }

  return {
    symbol: SOL_SYMBOL,
    price: doc.price,
    updatedAt: doc.updatedAt.toISOString(),
  }
}
