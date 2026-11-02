import { reloadSources } from "../../lib/mqtt";
import { createSource } from "../../lib/queries";
import { createSourceSchema } from "../../lib/validation";

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createSourceSchema.parse);
  const source = await createSource(body);
  await reloadSources();
  setResponseStatus(event, 201);
  return source;
});
