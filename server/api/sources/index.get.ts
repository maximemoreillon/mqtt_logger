import { listSources } from "../../lib/queries";
import { listSourcesQuerySchema } from "../../lib/validation";

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, listSourcesQuerySchema.parse);
  return listSources({ ...query, userId: event.context.user?.id });
});
