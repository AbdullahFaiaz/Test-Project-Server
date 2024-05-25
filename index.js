const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv").config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000

//middlewares
app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yncfr23.mongodb.net/?retryWrites=true&w=majority`;

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
 


    const panjabiCollection = client.db("tusharDB").collection("panjabi");
    const userCollection = client.db("tusharDB").collection("users");





    //JWT            auth related operation
    app.post('/jwt', async(req,res)=>{
      const user = req.body
      // console.log("user for token",user)

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET ,{expiresIn: '1h'})
      
      res.send({token})
    })


    app.post('/logout', async(req,res)=>{
      const user = req.body
      console.log("logging out ",user)
      res.clearCookie('token',{maxAge:0}).send({success: true})
    })


        //registration of new user from reg or login page
        app.post("/users", async(req,res)=>{
          const user = req.body
              // insert if user doesn't exist already
              const query = {email: user.email}
              const existingUser = await userCollection.findOne(query)
              if(existingUser){
                return res.send({message: "user already exists", insertedId: null})
              }
              else{
                const result = await userCollection.insertOne(user); 
                res.send(result)

              }
      })
      // my middlewares
const logger = async(req,res,next) =>{
  console.log("log: info ",req.method , req.url)
  next()
}

const verifyToken = async(req,res, next) =>{
  console.log("inside verify token",req.headers.authorization)
  if(!req.headers.authorization){
    return res.status(401).send({message: "unauthorized access"})
  }

  const token = req.headers.authorization.split(' ')[1]
  console.log(token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: "unauthorized access"})
    }
    req.decoded = decoded
    next()
  })
}
 // use verify admin after verifyToken
 const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  console.log(isAdmin)
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}



// get all users
      app.get("/users",verifyToken,verifyAdmin, async(req,res)=> {
        const result = await userCollection.find().toArray()
        res.send(result)
      } )
//making an admin
      app.patch("/users/admin/:id", async(req,res)=> {
        const id = req.params.id;
        const role = req.body
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: role
          // {role: "admin"}
          // {role: "user"}
        }
        const result = await userCollection.updateOne(filter,updatedDoc)
        res.send(result)
      })
// isAdmin 
app.get('/users/admin/:email', async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
  res.send({ admin });
})



//query verifyToken,
    app.get("/myProducts", async(req,res)=>{
      //req.user (=decoded) is coming from verifyToken
    // verify email
      // if(req.query.email !== req.user.email){
      //   return res.status(403).send({message:'forbidden access'})
      // }

      let query = {}
      const options = {
        projection: { product_type: 1, image: 1, price:1 },
      };
      if(req.query.email){
        query = {email: req.query.email}
        console.log(query)
      }
      const result = await panjabiCollection.find(query,options).toArray()
      res.send(result)
    })
    

    //post from add page
    app.post("/products", async(req,res)=>{
        const aPanjanbi = req.body
            // console.log("new panjabi", aPanjanbi)
            // Insert the defined document into the panjabiCollection
            const result = await panjabiCollection.insertOne(aPanjanbi); 
            res.send(result)
    })


//read a data from details page
    app.get("/details/:id", async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const product= await panjabiCollection.findOne(query)
      res.send(product)
  })

// pagination count
app.get("/productCount",async(req,res)=>{
  const count = await panjabiCollection.estimatedDocumentCount()
  res.send({count})
})
// pagination count from all product page
app.get("/allProducts/productCount",async(req,res)=>{
  const count = await panjabiCollection.estimatedDocumentCount()
  res.send({count})
})



//read all products from home page
app.get("/products", async(req,res)=>{
  const page = parseInt(req.query.page)
  const size = parseInt(req.query.size) 
    // console.log("getting ",page,size)

    const result = await panjabiCollection.find()
    .skip(page*size)
    .limit(size)
    .toArray()
    res.send(result)
})
//read all products from all products page

app.get("/allProducts", async(req,res)=>{
  const cursor = panjabiCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

//read all my products from My List page
// app.get("/products/:email", async(req,res)=>{
//     console.log(req.query.email)
//     const email = req.params.email
//     // let query = {}
//     const query = {email: email}
//     console.log(req)
//     const options = {
//       projection: { product_type: 1, image: 1, price:1 },
//     };
  
//     const result = await  panjabiCollection.find(query,options).toArray()
//     res.send(result)
// })




//update from update page:
          // read a product from my list page
          app.get("/update/:id", async(req,res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id)}
            const product= await panjabiCollection.findOne(query)
            res.send(product)
          })
  app.put("/update/:id", async(req,res)=>{
    const id = req.params.id
    const product = req.body
    console.log(id)

    const filter = {_id: new ObjectId(id)}
    //make a doc if no such doc exists (because it is put, not patch)
    const options = {upsert: true }
    const updatedProduct = {
        $set: {
            image : product.image,
            product_type : product.product_type,
            size  : product.size,
            fabric : product.fabric,
            color : product.color,
            price : product.price,
            occasion : product.occasion,
            email : product.email,
            user_name : product.user_name,
        }
    }
    const result = await panjabiCollection.updateOne(filter,updatedProduct,options)
    res.send(result)
  })

//delete operation from my list page:
      app.delete("/products/:id", async(req,res)=>{
        const id = req.params.id
        console.log('plz delete', id)
        const query = {_id: new ObjectId(id)}
        const result = await panjabiCollection.deleteOne(query)
        res.send(result)
      })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
   
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get("/",(req,res)=>{
    res.send("This is a (get) response from server")
})

app.listen(port,()=>{
    console.log(`Msg from server side: server is running on port ${port}`)
})