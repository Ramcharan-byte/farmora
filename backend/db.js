const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.MYSQLHOST || "localhost",
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "farmora@1234",
    database: process.env.MYSQLDATABASE || "farmora",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ MySQL connection failed:", err.message);
        return;
    }

    console.log("✅ Connected to Farmora MySQL database");
    connection.release();
});

module.exports = db;