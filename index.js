const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require("stripe")('sk_test_51L4fLCD15eCVhrzNVKFUgYIoojI0kjYJjWo0WLPPJRZEPnkOjjIh8IBTVnpyrOD6XKKI7KfYZsUviISe5F0ExkZi00GNwiaj4U')
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.MOTOR_PARTS_USER}:${process.env.MOTOR_PARTS_PASSWORD}@cluster0.zoggeky.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const bestSellerCollection = client.db("motorParts").collection("bestSeller")
        const blogCollection = client.db("motorParts").collection("blog")
        const profileCollection = client.db("motorParts").collection("profile")
        const orderCollection = client.db("motorParts").collection("orders")
        const paymentCollection = client.db("motorParts").collection("payments")
        const userCollection = client.db("motorParts").collection("users")


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                console.log('request', filter)
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result)
            } else {
                return res.status(403).send({ message: 'forbidden' })
            }

        })

        app.get('/user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })




        app.post('/bestSeller', async (req, res) => {
            const bestSeller = req.body;
            const result = await bestSellerCollection.insertOne(bestSeller)
            res.send(result)
        })
        app.get('/bestSeller', async (req, res) => {
            const query = {};
            const result = await bestSellerCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/bestSeller/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bestSellerCollection.findOne(query);
            res.send(result)
        })

        app.put('/bestSeller/:id', async (req, res) => {
            const id = req.params.id;
            const updateParts = req.body;
            console.log('form update', updateParts)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updateParts.name,
                    img: updateParts.img,
                    price: updateParts.price
                },
            };
            const result = await bestSellerCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.delete('/bestSeller/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bestSellerCollection.deleteOne(query);
            res.send(result)
        })

        app.post('/blog', async (req, res) => {
            const blog = req.body;
            const result = await blogCollection.insertOne(blog)
            res.send(result)
        })
        app.get('/blog', async (req, res) => {
            const query = {};
            const result = await blogCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/blog/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result)
        })




        app.post('/profile', async (req, res) => {
            const profile = req.body;
            console.log(profile)
            const result = await profileCollection.insertOne(profile)
            res.send(result)
        })

        app.get('/profile', async (req, res) => {
            const query = {};
            const result = await profileCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/profile/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await profileCollection.findOne(query);
            res.send(result)
        })

        app.put('/profile/:id', async (req, res) => {
            const id = req.params.id;
            const updateUser = req.body;
            console.log('form update', updateUser)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    number: updateUser.number,
                    address: updateUser.address,
                    education: updateUser.education
                },
            };
            const result = await profileCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })


        app.post('/orders', async (req, res) => {
            const order = req.body;
            console.log(order)
            const query = { email: order.email, number: order.number, name:order.name, total: order.total };
            const exist = await orderCollection.findOne(query);
            if (exist) {
                return res.send({ success: false, order: exist })
            }
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });
        })


        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await orderCollection.find(query).toArray();
            return res.send(result)

        })
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await orderCollection.findOne(query);
            res.send(orders)
        })
        app.post("/create-payment-intent", async (req, res) => {
            const service = req.body;
            console.log(service)
            const price = service.total;
            console.log(price)
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    tranjactionId: payment.tranjactionId
                },
            };
            const result = await paymentCollection.insertOne(payment)
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc)
            res.send(updatedOrder)
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})