import { getFields, getSource } from "../../../lib/queries";
import { idParamsSchema } from "../../../lib/validation";

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamsSchema.parse);
  if (!(await getSource(id, event.context.user?.id)))
    throw createError({ statusCode: 404, statusMessage: "Source not found" });
  return getFields(id);
});
