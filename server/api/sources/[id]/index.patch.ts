import { reloadSources } from "../../../lib/mqtt";
import { updateSource } from "../../../lib/queries";
import { idParamsSchema, updateSourceSchema } from "../../../lib/validation";

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamsSchema.parse);
  const body = await readValidatedBody(event, updateSourceSchema.parse);
  const source = await updateSource(id, event.context.user?.id, body);
  if (!source) throw createError({ statusCode: 404, statusMessage: "Source not found" });
  await reloadSources();
  return source;
});
