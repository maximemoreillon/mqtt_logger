import { Source } from "../models/source";
import { subscribe_single } from "../mqtt";
import { delete_measurement } from "./points";
import { Request, Response } from "express";
import createHTTPError from "http-errors";
import { z } from "zod";
export const create_source = async (req: Request, res: Response) => {
  const properties = req.body;
  const source = await Source.create(properties);
  console.log(`[MongoDB] Source ${source._id} created`);
  res.send(source);
};

const searchParamsSchema = z.object({
  sort: z.string().default("_id"),
  limit: z.coerce.number().default(50),
  skip: z.coerce.number().default(0),
  search: z.string().optional(),
  order: z.coerce
    .number()
    .default(1)
    .pipe(z.union([z.literal(1), z.literal(-1)])),
});

export const get_sources = async (req: Request, res: Response) => {
  const {
    skip = 0,
    limit = 50,
    order = -1,
    sort = "_id",
    search,
  } = searchParamsSchema.parse(req.query);

  const query: any = {};

  if (search) {
    const regex = { $regex: search, $options: "i" };
    const searchableProperties = ["name", "topic"];
    query.$or = searchableProperties.map((p) => ({ [p]: regex }));
  }
  const total = await Source.countDocuments(query);

  const items = await Source.find(query)
    .skip(Number(skip))
    .sort({ [sort]: order })
    .limit(Math.max(Number(limit), 0));

  res.send({ skip, limit, order, sort, total, items });
};

export const get_source = async (req: Request, res: Response) => {
  const { _id } = req.params;
  const source = await Source.findOne({ _id });
  if (!source) throw createHTTPError(404, `Source ${_id} not found`);
  res.send(source);
};

export const update_source = async (req: Request, res: Response) => {
  const { _id } = req.params;
  const properties = req.body;
  const options = { new: true };
  const source = await Source.findOneAndUpdate({ _id }, properties, options);
  if (!source) throw createHTTPError(404, `Source ${_id} not found`);
  console.log(`[MongoDB] Source ${_id} updated`);
  subscribe_single(source);

  res.send(source);
};

export const delete_source = async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await Source.findOneAndDelete({ _id });
  if (!result) throw createHTTPError(404, `Source ${_id} not found`);
  await delete_measurement(_id);
  console.log(`[MongoDB] Source ${_id} deleted`);
  res.send(result);
};
