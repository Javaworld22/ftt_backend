const express = require('express');
const router = express.Router();

const {
  loginCorporateAgent,
  registerCorporateAgent,
  getAllCorporateAgents,
  getCorporateAgent,
} = require('../controller/corporateAgent.controller');

router.post('/login', loginCorporateAgent);
router.post('/register', registerCorporateAgent);

router.get('/', getAllCorporateAgents);
router.get('/:id', getCorporateAgent);

module.exports = router;
