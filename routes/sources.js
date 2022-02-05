const {Router} = require('express')
const {
  get_sources
} = require('../controllers/sources.js')

const router = Router()

router.route('/')
  .get(get_sources)

module.exports = router
