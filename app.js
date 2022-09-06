const express = require('express');
const { sequelize, Users, Reservations } = require('./models');

const apartments = require('./routes/apartments');
const guests = require('./routes/guests');
const reservations = require('./routes/reservations');
const users = require('./routes/users');

const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const history = require('connect-history-api-fallback');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://127.0.0.1:8080',
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowIO3: true
});




var corsOptions = {
    origin: 'http://127.0.0.1:8080',
    optionsSuccessStatus: 200
}

app.use(express.json());
app.use(cors(corsOptions));

//app.use('/api', msgs);

app.use('/admin/apartments', apartments);
app.use('/admin/guests', guests);
app.use('/admin/reservations', reservations);
app.use('/admin/users', users);










function getCookies(req) {
    if (req.headers.cookie == null ) return {};

    const rawCookies = req.headers.cookie.split('; ');
    const parsedCookies = {};

    rawCookies.forEach(rawCookie => {
        const parsedCookie = rawCookie.split('=');
        parsedCookies[parsedCookie[0]] = parsedCookie[1];
    });

    return parsedCookies;
}



function authToken(req, res, next) {
    const cookies = getCookies(req);
    const token = cookies['token'];

    if (token == null) return res.redirect(301, '/login');

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.redirect(301, '/login');

        req.user = user;

        next();
    });
}



app.get('/api_register', (req, res) => {
    res.sendFile('registerAdmin.html', {root: './statc'});
})

app.get('/api_login', (req, res) => {
    res.sendFile('login.html', {root: './static'});
});

app.get('/', authToken, (req, res) => {
    res.sendFile('index.html', {root: './static'});
});



app.use(express.static(path.join(__dirname, 'static')));



function authSocket(msg, next) {
    if (msg[1].token == null) {
        next(new Error('Not Authenticated'));
    } else {
        jwt.verify(msg[1].token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                next(new Error(err));
            } else {
                msg[1].user = user;
                next();
            }
        });
    }
}

io.on('connection', socket => {
    socket.use(authSocket);

    socket.on('comment', rsv => {
        Reservations.create({guestJMBG: rsv.guestJMBG, apartmentName: rsv.apartmentName, dateOfArrival: rsv.dateOfArrival, dateOfDeparture: rsv.dateOfDeparture})
        .then(row => res.json(row))
        .catch(err => socket.emit('error', err.message) );
    });

    socket.on('comment', err => {
        socket.emit('error', err.message)
    });
});


const staticMdl = express.static(path.join(__dirname, 'dist'));

app.use(staticMdl);
app.use(history({ index: '/index.html' }));
app.use(staticMdl);


app.listen({port: process.env.PORT || 8000}, async() => {
    await sequelize.authenticate();
});


