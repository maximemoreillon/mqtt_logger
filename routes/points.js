const {Router} = require('express')
const {
  read_points,
} = require('../controllers/points.js')

const router = Router({mergeParams: true})

router.route('/')
  .get(read_points)


module.exports = router
