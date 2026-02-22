const express = require('express');
const router = express.Router();

const {
  loginProjectOwner,
  registerProjectOwner,
  getAllProjectOwners,
  getProjectOwner,
} = require('../controller/projectOwner.controller');

router.post('/login', loginProjectOwner);
router.post('/register', registerProjectOwner);

router.get('/', getAllProjectOwners);
router.get('/:id', getProjectOwner);

module.exports = router;
