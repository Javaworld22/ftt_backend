const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const mongoose = require("mongoose");
const cors = require("cors");

const dotenv = require("dotenv");
const path = require("path");
const redirectSSL = require('redirect-ssl')
const app = express()

const port = process.env.PORT || 3035
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
const prefix = "/api/v1";
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const campaignRouter = require('./api/router/campaign.router');
const donationRouter = require('./api/router/donation.router');
const donorRouter = require('./api/router/donor.router');
const seasonRouter = require('./api/router/season.router');
const agentRouter = require('./api/router/agent.router');
const corporateAgentRouter = require('./api/router/corporateAgent.router');
const projectOwnerRouter = require('./api/router/projectOwner.router');
const projectRouter = require('./api/router/project.router');

app.use(`${prefix}/campaigns`, campaignRouter);
app.use(`${prefix}/donations`, donationRouter);
app.use(`${prefix}/donors`, donorRouter);
app.use(`${prefix}/seasons`, seasonRouter);
app.use(`${prefix}/agents`, agentRouter);
app.use(`${prefix}/corporate-agents`, corporateAgentRouter);
app.use(`${prefix}/project-owners`, projectOwnerRouter);
app.use(`${prefix}/projects`, projectRouter);

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./api/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

// set the view engine to ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,'public')))
app.use('/assets',express.static(path.join(__dirname,'public/assets')))

const env = dotenv.config();
const connectionString = process.env.MONGODB_URI

// mongoose.connect(connectionString, { useUnifiedTopology: true })
//   .then(client => {
//     console.log('Connected to Database')
//      const db = client.db('aircrack')
//     console.log('Passed creating db')
//     // const values = db.collection('venttech_api')
//     console.log('Created collection')
//     // values.createIndex({ "phone": 1, }, { unique: true })



    app.get('/privacy-policy', function(req, res) {
      res.render('index');
    });

    app.get('/account-delete', function(req, res) {
      res.render('account_delete');
    });

// //})

app.listen(port, () => { console.log(`Starting the server at ${port}`) })
// }).catch(error => {
// console.error('Error occurred at database')
// console.error(error)

// })