import { reloadSources } from "../../../lib/mqtt";
import { deleteSource } from "../../../lib/queries";
import { idParamsSchema } from "../../../lib/validation";
import { discardSource } from "../../../lib/writer";

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamsSchema.parse);
  const source = await deleteSource(id, event.context.user?.id);
  if (!source) throw createError({ statusCode: 404, statusMessage: "Source not found" });
  discardSource(id);
  await reloadSources();
  return source;
});
