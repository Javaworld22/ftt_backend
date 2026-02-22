const express = require('express');
const router = express.Router();

const {
  loginAgent,
  registerAgent,
  getAllAgents,
  getAgent,
} = require('../controller/agent.controller');

router.post('/login', loginAgent);
router.post('/register', registerAgent);

router.get('/', getAllAgents);
router.get('/:id', getAgent);

module.exports = router;
