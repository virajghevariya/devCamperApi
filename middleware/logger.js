// @desc 

const { updateBootcamps } = require("../controller/bootcamps");

const logger = (req, res, next) => {
    console.log(`${req.method} ${req.protocol}:// ${req.get('host')} ${req.originalUrl}`);
    next();
};

module.exports = logger;