require('dotenv').config();
const express = require('express');
const session = require('express-session');
var https = require('https');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const app = express();
app.use('/images', express.static(__dirname + '/tmp/images'));
const port = process.env.PORT;
const routes = require('./routes/admin');
const userRoutes = require('./routes/user');
const cors = require('cors');
var queue = require('express-queue');
const createNotifications = require('./utils/createNotfication');
const cron = require('node-cron');
app.use(queue({
    activeLimit: 2,
    queuedLimit: -1
}));
require('./helpers/process');
const {cronReminder} = require('./cronjobs/crons');
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
let credentials = {};
let server = http.createServer(app);
let isProduction = process.env.NODE_ENV == 'production' ? true : false;
if (isProduction) {
    credentials = {
        key: fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.key', 'utf8'),
        cert: fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.crt', 'utf8'),
        ca: fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.ca')
    };
    server = https.createServer(credentials, app);
}
app.use('/auth', routes);
app.use('/api', userRoutes);
app.get('/', (req, res) => {
    res.send('login');
});
app.get('/api/reminder/:type?', cronReminder);
server.listen(port, () => {
    console.log('app is running ', port);
});
const io = require('./utils/socket-config').init(server);
io.on('connection', socket => {
    console.log('client joined');
    socket.on('danyelle_notifications', data => {
        console.log('danyelle notifications :', data);
        io.emit('danyelle_notifications', data);
        createNotifications(io);
    });
    server.listen(6000, () => {
        console.log('\x1B[' + 34 + 'm' + `Server started on port: ${ 6000 }` + '\x1B[0m');
    });
});