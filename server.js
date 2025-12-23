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
const prefix = "/api/venttech/v1";
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// set the view engine to ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,'public')))
app.use('/assets',express.static(path.join(__dirname,'public/assets')))

const env = dotenv.config();
const connectionString = process.env.mongoLogin

// mongoose.connect(connectionString, { useUnifiedTopology: true })
//   .then(client => {
//     console.log('Connected to Database')
//      const db = client.db('aircrack')
//     console.log('Passed creating db')
//     // const values = db.collection('venttech_api')
//     console.log('Created collection')
//     // values.createIndex({ "phone": 1, }, { unique: true })



    app.get('/', function(req, res) {
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