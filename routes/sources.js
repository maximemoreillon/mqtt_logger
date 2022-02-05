const {Router} = require('express')
const {
  create_source,
  get_sources,
  get_source,
  update_source,
  delete_source,
} = require('../controllers/sources.js')

const router = Router()

router.route('/')
  .post(create_source)
  .get(get_sources)

router.route('/:_id')
  .get(get_source)
  .patch(update_source)
  .delete(delete_source)

module.exports = router
