import { Router } from "express"
import { read_points } from "../controllers/points"

const router = Router({ mergeParams: true })

router.route("/").get(read_points)

export default router
