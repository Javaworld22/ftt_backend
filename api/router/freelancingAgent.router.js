const express = require('express');
const router = express.Router();

const {
  loginFreelancingAgent,
  registerFreelancingAgent,
  getAllFreelancingAgents,
  getFreelancingAgent,
} = require('../controller/freelancingAgent.controller');

router.post('/login', loginFreelancingAgent);
router.post('/register', registerFreelancingAgent);

router.get('/', getAllFreelancingAgents);
router.get('/:id', getFreelancingAgent);

module.exports = router;