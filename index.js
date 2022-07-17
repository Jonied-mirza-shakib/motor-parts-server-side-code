const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.MOTOR_PARTS_USER}:${process.env.MOTOR_PARTS_PASSWORD}@cluster0.zoggeky.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader=req.headers.authorization;
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
        const partsCollection = client.db("motorParts").collection("parts")
        const reviewCollection = client.db("motorParts").collection("review")
        const profileCollection = client.db("motorParts").collection("profile")
        const orderCollection = client.db("motorParts").collection("orders")
        const paymentCollection = client.db("motorParts").collection("payments")
        const userCollection = client.db("motorParts").collection("users")


        app.put('/user/:email',async(req,res)=>{
            const email=req.params.email;
            const user=req.body;
            const filter={email: email};
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
              };
              const result = await userCollection.updateOne(filter, updateDoc, options);
              const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
              res.send({result,token})
        })

        app.put('/user/admin/:email', verifyJWT, async(req,res)=>{
            const email=req.params.email;
            const requester=req.decoded.email;
            const requesterAccount= await userCollection.findOne({email: requester});
            if(requesterAccount.role==='admin'){
                const filter={email: email};
                console.log('request',filter)
                const updateDoc = {
                    $set: { role: 'admin' },
                  };
                  const result = await userCollection.updateOne(filter, updateDoc);
                  res.send(result)
            }else{
                return res.status(403).send({message:'forbidden'})
            }
           
        })

        app.get('/user', async(req,res)=>{
           const result=await userCollection.find().toArray();
           res.send(result)
        })

        app.get('/admin/:email',async(req,res)=>{
            const email=req.params.email;
            const user =await userCollection.findOne({email: email});
            const isAdmin= user?.role==='admin';
            res.send({admin: isAdmin})
        })

        app.delete('/user/:id', async(req,res)=>{
            const id=req.params.id;
            const query={_id: ObjectId(id)};
            const result=await userCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/parts', async (req, res) => {
            const query = {};
            const result = await partsCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.findOne(query);
            res.send(result)
        })
        app.post('/parts', async (req, res) => {
            const parts = req.body;
            console.log(parts)
            const result = await partsCollection.insertOne(parts)
            res.send(result)
        })
        app.get('/review',verifyJWT, async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result)
        })
        app.post('/review', async (req, res) => {
            const review = req.body;
            console.log(review)
            const result = await reviewCollection.insertOne(review)
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
        app.put('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const updateParts = req.body;
            console.log('form update', updateParts)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updateParts.name,
                    description: updateParts.description,
                    photoURL: updateParts.photoURL,
                    price: updateParts.price,
                    minimum_order_quantity: updateParts.minimum_order_quantity
                },
            };
            const result = await partsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const query = { name: order.name, email: order.email, number: order.number, address: order.address, order: order.order };
            const exist = await orderCollection.findOne(query);
            if (exist) {
                return res.send({ success: false, order: exist })
            }
            const result = await orderCollection.insertOne(order);
            console.log('success')
            return res.send({ success: true, result });
        })
        app.get('/orders', async (req, res) => {
            const email= req.query.email;
                const query = {email:email};
                const result = await orderCollection.find(query).toArray();
                return res.send(result)
           
        })
        app.get('/orders/:id',async(req,res)=>{
            const id =req.params.id;
            const query={_id: ObjectId(id)};
            const orders=await orderCollection.findOne(query);
            res.send(orders)
        })
        app.post("/create-payment-intent", async (req, res) => {
            const service= req.body;
            console.log(service)
            const price=service.order;
            console.log(price)
            const amount=price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
              });
              res.send({clientSecret: paymentIntent.client_secret});
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
            const id=req.params.id;
            const query={_id: ObjectId(id)};
            const result=await orderCollection.deleteOne(query);
            res.send(result)
        })


        app.delete('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
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