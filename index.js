const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json())

//middleware jwt verify
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized Access'})
  }

  //bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized Access'});
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.some2ew.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const reviewsCollection = client.db('doc-houseDb').collection('reviews')
    const doctorCollection = client.db('doc-houseDb').collection('doctors')
    const appointmentCollection = client.db('doc-houseDb').collection('appointments')
    const userCollection = client.db('doc-houseDb').collection('users')

    //jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: '1hr'})
      res.send({token})
    })

     // Warning: use verifyJWT before using verifyAdmin
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    //taking appointment confirmation from user
    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      res.send(result);
    })
    

    //getting all user appointments
    app.get('/appointments', verifyJWT, async (req, res) => {
      const email = req.query.email;
      let query = {}

      const decodedEmail = req.decoded.email;

      if(email){
        query = {email: email}
      }

      const result = await appointmentCollection.find(query).toArray()
      res.send(result);
    })

    //deleting a user appointment
    app.delete('/appointments/:id', async (req, res) => {
      const id = req.params.id; 
      console.log('Delete Req, Id:', id);
      const query = {_id: new ObjectId(id)}
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    })

    /*
    user profile / admin (post)
    */
    app.post('/users', verifyJWT, async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      let query = {email: req.query.email}
      const result = await userCollection.find(query).toArray()
      res.send(result);
    })


    app.get('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      
      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })
    
    //all user
    app.get('/allUsers', verifyJWT, async (req, res) => {      
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    
    
    // doctors apis
    app.get('/doctors/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await doctorCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/reviews', async (req, res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
    })

    app.get('/doctors', async (req, res) => {
      const result = await doctorCollection.find().toArray();
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Doc House Server')
})

app.listen(port, () => {
    console.log('Doc House server running on port', port);
})