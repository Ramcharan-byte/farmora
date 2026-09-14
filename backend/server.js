const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");

const db = require("./db");

const app = express();
const PORT = 5000;


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ==========================================
// CORS
// ==========================================

app.use(
    cors({
        origin: [
            "http://localhost:5500",
            "http://127.0.0.1:5500"
        ],
        credentials: true
    })
);


// ==========================================
// SESSION
// ==========================================

app.use(
    session({
        secret: "farmora-secret-key-2026",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 30
        }
    })
);


// ==========================================
// SERVE FARMORA WEBSITE
// ==========================================

app.use(express.static(path.join(__dirname, "..")));


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "..", "index.html")
    );

});


// ==========================================
// SIGNUP
// ==========================================

app.post("/api/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password,
            role
        } = req.body;


        // Check all fields

        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !role
        ) {

            return res.status(400).json({

                success: false,

                message: "Please fill all fields."

            });

        }


        // Check role

        if (
            role !== "farmer" &&
            role !== "buyer"
        ) {

            return res.status(400).json({

                success: false,

                message: "Invalid role."

            });

        }


        // Check existing user

        const [existingUsers] =
            await db.promise().query(

                "SELECT id FROM users WHERE email = ?",

                [email]

            );


        if (existingUsers.length > 0) {

            return res.status(400).json({

                success: false,

                message: "Email already registered."

            });

        }


        // Hash password

        const passwordHash =
            await bcrypt.hash(password, 10);


        // Insert user

        await db.promise().query(

            `INSERT INTO users
            (name, email, phone, password_hash, role)
            VALUES (?, ?, ?, ?, ?)`,

            [
                name,
                email,
                phone,
                passwordHash,
                role
            ]

        );


        console.log(
            "✅ Account created:",
            email,
            "Role:",
            role
        );


        // Successful response

        res.status(201).json({

            success: true,

            message: "Account created successfully."

        });

    }


    catch (error) {

        console.error(
            "❌ Signup error:",
            error
        );


        res.status(500).json({

            success: false,

            message: "Server error."

        });

    }

});


// ==========================================
// LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password,
            role
        } = req.body;


        console.log(
            "Login attempt:",
            email,
            role
        );


        if (
            !email ||
            !password ||
            !role
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email, password and role are required."

            });

        }


        // Find user

        const [users] =
            await db.promise().query(

                `SELECT
                    id,
                    name,
                    email,
                    phone,
                    password_hash,
                    role
                 FROM users
                 WHERE email = ?
                 AND role = ?`,

                [
                    email,
                    role
                ]

            );


        if (users.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email, password or role."

            });

        }


        const user = users[0];


        // Compare password

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email, password or role."

            });

        }


        // ======================================
        // CREATE SESSION
        // ======================================

        req.session.user = {

            id: user.id,

            name: user.name,

            email: user.email,

            phone: user.phone,

            role: user.role

        };


        console.log(
            "SESSION CREATED:",
            req.session.user
        );


        // ======================================
        // SAVE SESSION
        // ======================================

        req.session.save((err) => {

            if (err) {

                console.error(
                    "Session save error:",
                    err
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Could not create login session."

                });

            }


            console.log(
                "Login successful:",
                user.email,
                "Role:",
                user.role
            );


            res.json({

                success: true,

                message:
                    "Login successful.",

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email,

                    phone: user.phone,

                    role: user.role

                }

            });

        });

    }


    catch (error) {

        console.error(
            "❌ Login error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Server error."

        });

    }

});


// ==========================================
// CHECK CURRENT USER
// ==========================================

app.get("/api/me", (req, res) => {

    console.log(
        "Checking session:",
        req.session.user
    );


    if (!req.session.user) {

        return res.status(401).json({

            loggedIn: false,

            message:
                "Not logged in."

        });

    }


    res.json({

        loggedIn: true,

        user: req.session.user

    });

});


// ==========================================
// LOGOUT
// ==========================================

app.post("/api/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.error(
                "❌ Logout error:",
                err
            );


            return res.status(500).json({

                success: false,

                message:
                    "Logout failed."

            });

        }


        res.clearCookie("connect.sid");


        res.json({

            success: true,

            message:
                "Logged out successfully."

        });

    });

});


// ==========================================
// ADD PRODUCT
// ==========================================

app.post("/api/products", async (req, res) => {

    try {

        // Check farmer login

        if (!req.session.user) {

            return res.status(401).json({

                message:
                    "Please login first."

            });

        }


        // Only farmers

        if (
            req.session.user.role !== "farmer"
        ) {

            return res.status(403).json({

                message:
                    "Only farmers can add produce."

            });

        }


        const {
            name,
            category,
            quantity,
            unit,
            price,
            location,
            quality
        } = req.body;


        // Validate fields

        if (
            !name ||
            !category ||
            !quantity ||
            !unit ||
            !price ||
            !location
        ) {

            return res.status(400).json({

                message:
                    "Please fill all required fields."

            });

        }


        // Insert product

        const [result] =
            await db.promise().query(

                `INSERT INTO products
                (
                    farmer_id,
                    name,
                    category,
                    quantity,
                    unit,
                    price,
                    location,
                    quality
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

                [
                    req.session.user.id,
                    name,
                    category,
                    quantity,
                    unit,
                    price,
                    location,
                    quality || "Good"
                ]

            );


        console.log(
            "✅ Product added:",
            name,
            "by farmer:",
            req.session.user.email
        );


        res.status(201).json({

            success: true,

            message:
                "Produce added successfully.",

            product: {

                id: result.insertId,

                farmer_id:
                    req.session.user.id,

                name,

                category,

                quantity,

                unit,

                price,

                location,

                quality:
                    quality || "Good"

            }

        });

    }


    catch (error) {

        console.error(
            "❌ Add product error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to add product."

        });

    }

});


// ==========================================
// GET ALL PRODUCTS
// ==========================================

app.get("/api/products", async (req, res) => {

    try {

        const [products] =
            await db.promise().query(

                `SELECT
                    products.id,
                    products.name,
                    products.category,
                    products.quantity,
                    products.unit,
                    products.price,
                    products.location,
                    products.quality,
                    products.created_at,

                    users.id AS farmer_id,
                    users.name AS farmer_name

                FROM products

                INNER JOIN users
                    ON products.farmer_id = users.id

                ORDER BY products.created_at DESC`

            );


        res.json(products);

    }


    catch (error) {

        console.error(
            "❌ Get products error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to load products."

        });

    }

});


// ==========================================
// ORDERS API
// ==========================================


// ==========================================
// BUYER - PLACE ORDER
// ==========================================

app.post("/api/orders", async (req, res) => {

    try {

        // Check login

        if (!req.session.user) {

            return res.status(401).json({

                message:
                    "Please login first."

            });

        }


        // Only buyers

        if (
            req.session.user.role !== "buyer"
        ) {

            return res.status(403).json({

                message:
                    "Only buyers can place orders."

            });

        }


        const buyerId =
            req.session.user.id;


        const {
            productId,
            quantity,
            buyerName,
            buyerPhone,
            deliveryAddress
        } = req.body;


        // Validate data

        if (
            !productId ||
            !quantity ||
            !buyerName ||
            !buyerPhone ||
            !deliveryAddress
        ) {

            return res.status(400).json({

                message:
                    "Please provide all order details."

            });

        }


        // Get product + farmer

        const [products] =
            await db.promise().query(

                `SELECT
                    products.id,
                    products.name,
                    products.quantity,
                    products.unit,
                    products.price,
                    products.farmer_id,
                    users.name AS farmer_name

                 FROM products

                 INNER JOIN users
                 ON products.farmer_id = users.id

                 WHERE products.id = ?`,

                [productId]

            );


        if (products.length === 0) {

            return res.status(404).json({

                message:
                    "Product not found."

            });

        }


        const product =
            products[0];


        // Check available quantity

        if (
            Number(quantity) >
            Number(product.quantity)
        ) {

            return res.status(400).json({

                message:
                    `Only ${product.quantity} ${product.unit} available.`

            });

        }


        // Calculate total

        const total =
            Number(product.price) *
            Number(quantity);


        // Insert order

        const [result] =
            await db.promise().query(

                `INSERT INTO orders
                (
                    buyer_id,
                    farmer_id,
                    product_id,
                    product_name,
                    quantity,
                    unit,
                    price,
                    total,
                    buyer_name,
                    buyer_phone,
                    delivery_address,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

                [
                    buyerId,
                    product.farmer_id,
                    product.id,
                    product.name,
                    quantity,
                    product.unit,
                    product.price,
                    total,
                    buyerName,
                    buyerPhone,
                    deliveryAddress,
                    "New Order"
                ]

            );


        // Reduce quantity

        await db.promise().query(

            `UPDATE products
             SET quantity = quantity - ?
             WHERE id = ?`,

            [
                quantity,
                productId
            ]

        );


        console.log(
            "✅ New order created:",
            result.insertId
        );


        res.status(201).json({

            success: true,

            message:
                "Order placed successfully.",

            order: {

                id:
                    result.insertId,

                productName:
                    product.name,

                quantity:
                    quantity,

                unit:
                    product.unit,

                price:
                    product.price,

                total:
                    total,

                farmer:
                    product.farmer_name,

                status:
                    "New Order"

            }

        });

    }


    catch (error) {

        console.error(
            "❌ Place order error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to place order."

        });

    }

});


// ==========================================
// FARMER - GET THEIR ORDERS
// ==========================================

app.get("/api/farmer/orders", async (req, res) => {

    try {

        // Check login

        if (!req.session.user) {

            return res.status(401).json({

                message:
                    "Please login first."

            });

        }


        // Only farmers

        if (
            req.session.user.role !== "farmer"
        ) {

            return res.status(403).json({

                message:
                    "Only farmers can view farmer orders."

            });

        }


        const farmerId =
            req.session.user.id;


        const [orders] =
            await db.promise().query(

                `SELECT
                    orders.id,
                    orders.product_id,
                    orders.product_name,
                    orders.quantity,
                    orders.unit,
                    orders.price,
                    orders.total,
                    orders.buyer_name,
                    orders.buyer_phone,
                    orders.delivery_address,
                    orders.status,
                    orders.created_at,
                    users.name AS farmer_name

                 FROM orders

                 INNER JOIN users
                 ON orders.farmer_id = users.id

                 WHERE orders.farmer_id = ?

                 ORDER BY orders.created_at DESC`,

                [farmerId]

            );


        res.json(orders);

    }


    catch (error) {

        console.error(
            "❌ Get farmer orders error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to load orders."

        });

    }

});


// ==========================================
// FARMER - UPDATE ORDER STATUS
// ==========================================

app.patch(
    "/api/orders/:id/status",
    async (req, res) => {

        try {

            // Check login

            if (!req.session.user) {

                return res.status(401).json({

                    message:
                        "Please login first."

                });

            }


            // Only farmers

            if (
                req.session.user.role !== "farmer"
            ) {

                return res.status(403).json({

                    message:
                        "Only farmers can update orders."

                });

            }


            const orderId =
                req.params.id;


            const { status } =
                req.body;


            const allowedStatuses = [

                "New Order",

                "Accepted",

                "Preparing",

                "Ready for Pickup",

                "Picked Up",

                "In Transit",

                "Delivered",

                "Rejected"

            ];


            if (
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({

                    message:
                        "Invalid order status."

                });

            }


            // Check order belongs to farmer

            const [orders] =
                await db.promise().query(

                    `SELECT id
                     FROM orders
                     WHERE id = ?
                     AND farmer_id = ?`,

                    [
                        orderId,
                        req.session.user.id
                    ]

                );


            if (orders.length === 0) {

                return res.status(404).json({

                    message:
                        "Order not found."

                });

            }


            // Update status

            await db.promise().query(

                `UPDATE orders
                 SET status = ?
                 WHERE id = ?`,

                [
                    status,
                    orderId
                ]

            );


            console.log(
                `✅ Order ${orderId} → ${status}`
            );


            res.json({

                success: true,

                message:
                    "Order status updated.",

                orderId:
                    orderId,

                status:
                    status

            });

        }


        catch (error) {

            console.error(
                "❌ Update order error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to update order."

            });

        }

    }
);


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Farmora server running on port ${PORT}`);
});