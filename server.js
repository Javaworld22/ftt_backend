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
const userRouter = require('./api/router/user.router');

app.use(`${prefix}/campaigns`, campaignRouter);
app.use(`${prefix}/donations`, donationRouter);
app.use(`${prefix}/donors`, donorRouter);
app.use(`${prefix}/seasons`, seasonRouter);
app.use(`${prefix}/agents`, agentRouter);
app.use(`${prefix}/corporate-agents`, corporateAgentRouter);
app.use(`${prefix}/project-owners`, projectOwnerRouter);
app.use(`${prefix}/projects`, projectRouter);
app.use(`${prefix}/users`, userRouter);

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

const { PORT, MONGODB_URI, JWT_KEY } = process.env;


    app.get('/privacy-policy', function(req, res) {
      res.render('index');
    });

    app.get('/account-delete', function(req, res) {
      res.render('account_delete');
    });

	app.get('/sql-examples', function(req, res) {
		res.render('sql_example');
	  });

app.listen(PORT, () => {
	console.info(`Node server listening on port: ${PORT}`);
	console.log("connecting to database, please wait...");
	console.log(`Server running on http://localhost/api/v1:${PORT}`)
	const mongoURI = connectionString;

	// Skip DB connection if URI is not configured
	if (!mongoURI || mongoURI.includes('your-connection-string')) {
		console.warn("⚠️  MongoDB not configured - running without database");
		console.warn("   Set MONGO_DB_URI in .env to enable database features");
		return;
	}

	console.log("connecting to database, please wait...");
	mongoose
		.connect(mongoURI)
		.then(() => {
			console.info("✅ database connection established");
		})
		.catch((err) => {
			console.log(`err: ${err}`);
			console.warn("database connection failed, please check your network!");
		});

})