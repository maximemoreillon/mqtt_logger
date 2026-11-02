import { getSource } from "../../../lib/queries";
import { idParamsSchema } from "../../../lib/validation";

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamsSchema.parse);
  const source = await getSource(id);
  if (!source) throw createError({ statusCode: 404, statusMessage: "Source not found" });
  return source;
});
