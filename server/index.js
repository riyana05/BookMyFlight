

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { connectDB } = require('./config/db');

const app = express();


connectDB();



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS — allow same origin (frontend + API share one Vercel domain)
app.use(cors({ origin: true, credentials: true }));

app.use('/api', routes);


app.use(express.static(path.join(__dirname, '../client/public')));

app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
