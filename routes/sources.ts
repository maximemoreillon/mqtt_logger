import { Router } from "express"
import {
  create_source,
  get_sources,
  get_source,
  update_source,
  delete_source,
} from "../controllers/sources"
import points_router from "./points"

const router = Router()

router.route("/").post(create_source).get(get_sources)

router.route("/:_id").get(get_source).patch(update_source).delete(delete_source)

router.use("/:_id/points", points_router)

export default router
