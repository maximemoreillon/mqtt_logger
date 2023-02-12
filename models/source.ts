import { Schema, model } from "mongoose"

export interface ITag {
  _id: string
  key: string
  value: string
}

export interface ISource {
  _id: string
  name: string
  description: string
  user_id: string
  topic: string
  keys: string[]
  tags: ITag[]
}

const tagSchemma = new Schema<ITag>({
  key: String,
  value: String,
})

const schema = new Schema<ISource>({
  name: String,
  description: String,
  user_id: String,
  topic: String,
  keys: { type: [String], default: [] },
  tags: { type: [tagSchemma], default: [] },
})

export const Source = model("Source", schema)
