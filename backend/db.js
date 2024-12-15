const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres', 
    host: 'localhost',
    database: 'campus_events',
    password: 'selasie', 
    port: 5432, 
});

module.exports = pool;
