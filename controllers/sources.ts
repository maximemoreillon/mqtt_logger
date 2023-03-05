import { Source } from "../models/source"
import { subscribe_single } from "../mqtt"
import { delete_measurement } from "./points"
import { Request, Response } from "express"

export const create_source = async (req: Request, res: Response) => {
  const properties = req.body
  const source = await Source.create(properties)
  console.log(`[MongoDB] Source ${source._id} created`)
  res.send(source)
}

export const get_sources = async (req: Request, res: Response) => {
  // TODO: find type of query
  const {
    skip = 0,
    limit = 50,
    order = -1,
    sort = "_id",
    search,
  } = req.query as any

  const query: any = {}

  if (search) {
    const regex = { $regex: search, $options: "i" }
    const searchableProperties = ["name", "topic"]
    query.$or = searchableProperties.map((p) => ({ [p]: regex }))
  }
  const total = await Source.countDocuments(query)

  const sources = await Source.find(query)
    .skip(Number(skip))
    .sort({ [sort]: order })
    .limit(Math.max(Number(limit), 0))

  res.send({ skip, limit, order, sort, total, items: sources })
}

export const get_source = async (req: Request, res: Response) => {
  const { _id } = req.params
  const source = await Source.findOne({ _id })
  res.send(source)
}

export const update_source = async (req: Request, res: Response) => {
  const { _id } = req.params
  const properties = req.body
  const source = await Source.findOneAndUpdate({ _id }, properties, {
    new: true,
  })
  console.log(`[MongoDB] Source ${_id} updated`)
  subscribe_single(source)

  res.send(source)
}

export const delete_source = async (req: Request, res: Response) => {
  const { _id } = req.params
  const result = await Source.findOneAndDelete({ _id })
  await delete_measurement(_id)
  console.log(`[MongoDB] Source ${_id} deleted`)
  res.send(result)
}
