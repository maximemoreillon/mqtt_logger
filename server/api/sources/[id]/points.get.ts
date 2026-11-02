import { getPoints, getSource } from "../../../lib/queries";
import { idParamsSchema, pointsQuerySchema } from "../../../lib/validation";

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamsSchema.parse);
  const query = await getValidatedQuery(event, pointsQuerySchema.parse);
  if (!(await getSource(id, event.context.user?.id)))
    throw createError({ statusCode: 404, statusMessage: "Source not found" });
  return getPoints(id, query);
});
