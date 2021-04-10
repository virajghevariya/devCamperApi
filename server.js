const path = require('path');
const express = require ('express');
const dotenv = require ('dotenv');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const cookieParser = require('cookie-parser');
const colors = require('colors');
const fileupload = require('express-fileupload');

// Load env var
dotenv.config({ path: './config/config.env' });

// Connect to DataBase
connectDB();

// Route Files
const bootcamps = require('./routes/bootcamps');
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const users = require('./routes/users');


// const { token } = require('morgan');

// Mounte Routes
const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if(process.env.NODE_ENV === 'development') {
    // app.use(morgan('dev'));
} 

// File uploading
app.use(fileupload());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount Routers
app.use('/api/v1/bootcamps', bootcamps);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);


app.use(errorHandler);

const PORT = process.env.PORT || 5000; 

const server = app.listen(PORT, console.log(`Server is running in ${process.env.NODE_ENV} mode on port: ${PORT}`));

// Handle Unhandle Process Rejection
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close( () => process.exit(1));
});