const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");
// var token = jwt.sign({ foo: "bar" }, "shhhhh");
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifytoken = (req, res, next) => {
  console.log("inside the verifytoken");
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  console.log("token inside the verifyToken", token);
  jwt.verify(token, process.env.JWT_SECRETE, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "unauthorized access",
      });
    }
    req.user = decoded;
    // Attach decoded user information to req.user
    next();
    // // Continue to the next middleware or route handler
  });
};

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2b6ta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const coffeeCollection = client.db("coffeeDB").collection("coffee");

    // below two r needed for assignment
    const visaCollection = client.db("visaDB").collection("visa");
    const artifactCollection = client
      .db("artifactCollection")
      .collection("artifact");
    const likes = client.db("likecollection").collection("likes");
    const userCollection = client.db("userDB").collection("users");
    const appliedVisaCollection = client
      .db("appliedVisaDB")
      .collection("appliedVisa");

    // auth related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRETE, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
      // res.send(token);
    });
    app.get("/artifacts/:id", verifytoken, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await artifactCollection.findOne(query);
      res.send(result);
    });

    app.post("/like/:artifactId", async (req, res) => {
      try {
        const { artifactId } = req.params;
        const { email } = req.body;
        const artifact = await artifactCollection.findOne({
          _id: new ObjectId(artifactId),
        });
        if (!artifact) {
          return res.status(404).json({ message: "Artifact not found" });
        }
        const userLike = await likes.findOne({
          artifactId: new ObjectId(artifactId),
          email,
        });
        let update;
        if (userLike) {
          await likes.deleteOne({ _id: userLike._id });
          update = { $inc: { likes: -1 } };
        } else {
          await likes.insertOne({
            artifactId: new ObjectId(artifactId),
            email,
          });
          update = { $inc: { likes: 1 } };
        }
        const result = await artifactCollection.findOneAndUpdate(
          { _id: new ObjectId(artifactId) },
          update,
          { returnDocument: "after" }
        );
        res.status(200).json({
          message: "Artifact like status toggled!",
          likes: result.value.likes,
        });
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });

    // Endpoint to check if a user has liked an artifact
    app.get("/likes/:artifactId/:email", async (req, res) => {
      try {
        const { artifactId, email } = req.params;
        const userLike = await likes.findOne({
          artifactId: new ObjectId(artifactId),
          email: email,
        });
        res.status(200).json({ liked: !!userLike });
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });

    // app.get("/likedArtifacts/:email", verifytoken, async (req, res) => {
    //   const email = req.params.email;

    //   if (req.user.email !== email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   try {
    //     // Find the likes for the user
    //     const userLikes = await likes.find({ email }).toArray();
    //     const artifactIds = userLikes.map((like) => like.artifactId);

    //     // Find the artifacts based on the liked artifact IDs
    //     const likedArtifacts = await artifactCollection
    //       .find({ _id: { $in: artifactIds } })
    //       .toArray();

    //     res.status(200).json(likedArtifacts);
    //   } catch (error) {
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });
    // app.get("/likedArtifacts/:email", verifytoken, async (req, res) => {
    //   const email = req.params.email;

    //   // Check if the authenticated user's email matches the requested email
    //   if (req.user.email !== email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   try {
    //     // Find the likes for the user
    //     const userLikes = await likes.find({ email }).toArray();
    //     const artifactIds = userLikes.map((like) => like.artifactId);

    //     // Find the artifacts based on the liked artifact IDs
    //     const likedArtifacts = await artifactCollection
    //       .find({ _id: { $in: artifactIds } })
    //       .toArray();

    //     res.status(200).json(likedArtifacts);
    //   } catch (error) {
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });

    // app.get("/likedArtifacts/:email", verifytoken, async (req, res) => {
    //   const email = req.params.email;

    //   // Log the email received and the authenticated user's email
    //   console.log("Requested email:", email);
    //   console.log("Authenticated email:", req.user.email);

    //   // Check if the authenticated user's email matches the requested email
    //   if (req.user.email !== email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   try {
    //     // Find the likes for the user
    //     const userLikes = await likes.find({ email }).toArray();
    //     const artifactIds = userLikes.map((like) => like.artifactId);

    //     // Log the found artifact IDs
    //     console.log("Artifact IDs:", artifactIds);

    //     // Ensure artifactIds are converted to ObjectId
    //     // const objectIdArtifactIds = artifactIds.map((id) => { new ObjectId(id)});
    //     const objectIdArtifactIds = artifactIds.map((id) => { ObjectId.createFromHexString(id);});

    //     // Find the artifacts based on the liked artifact IDs
    //     const likedArtifacts = await artifactCollection
    //       .find({ _id: { $in: objectIdArtifactIds } })
    //       .toArray();

    //     // Log the found liked artifacts
    //     console.log("Liked Artifacts:", likedArtifacts);

    //     res.status(200).json(likedArtifacts);
    //   } catch (error) {
    //     console.error("Error fetching liked artifacts:", error);
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });

    // app.get("/likedArtifacts/:email", verifytoken, async (req, res) => {
    //   const email = req.params.email;

    //   // Log the email received and the authenticated user's email
    //   console.log("Requested email:", email);
    //   console.log("Authenticated email:", req.user.email);

    //   // Check if the authenticated user's email matches the requested email
    //   if (req.user.email !== email) {
    //     return res.status(403).send({ message: "Forbidden access" });
    //   }

    //   try {
    //     // Find the likes for the user
    //     const userLikes = await likes.find({ email }).toArray();
    //     const artifactIds = userLikes.map((like) => like.artifactId);

    //     // Log the found artifact IDs
    //     console.log("Artifact IDs:", artifactIds);

    //     // Ensure artifactIds are valid ObjectId
    //     const validArtifactIds = artifactIds.filter((id) => ObjectId.isValid(id));

    //     // Log the validated ObjectIds
    //     console.log("Valid Artifact IDs:", validArtifactIds);

    //     // Find the artifacts based on the liked artifact IDs
    //     const likedArtifacts = await artifactCollection
    //       .find({ _id: { $in: validArtifactIds } })
    //       .toArray();

    //     // Log the found liked artifacts
    //     console.log("Liked Artifacts:", likedArtifacts);

    //     res.status(200).json(likedArtifacts);
    //   } catch (error) {
    //     console.error("Error fetching liked artifacts:", error);
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });

    app.get("/likedArtifacts/:email", verifytoken, async (req, res) => {
      const email = req.params.email;

      // Log the email received and the authenticated user's email
      console.log("Requested email:", email);
      console.log("Authenticated email:", req.user.email);

      // Check if the authenticated user's email matches the requested email
      if (req.user.email !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      try {
        // Find the likes for the user
        const userLikes = await likes.find({ email }).toArray();
        const artifactIds = userLikes.map((like) => like.artifactId);

        // Log the found artifact IDs
        console.log("Artifact IDs:", artifactIds);

        // Ensure artifactIds are valid ObjectId
        const validArtifactIds = artifactIds.filter((id) =>
          ObjectId.isValid(id)
        );

        // Log the validated ObjectIds
        console.log("Valid Artifact IDs:", validArtifactIds);

        // Find the artifacts based on the liked artifact IDs
        const likedArtifacts = await artifactCollection
          .find({ _id: { $in: validArtifactIds } })
          .toArray();

        // Log the found liked artifacts
        console.log("Liked Artifacts:", likedArtifacts);

        res.status(200).json(likedArtifacts);
      } catch (error) {
        console.error("Error fetching liked artifacts:", error);
        res.status(500).json({ message: "Server error", error });
      }
    });

    app.get("/api/top-artifacts", async (req, res) => {
      // const client = new MongoClient(url, {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
      // });
      try {
        // await client.connect();
        // const db = client.db(dbName);
        // const collection = db.collection("artifacts");
        const artifacts = await artifactCollection
          .find()
          .sort({ likes: -1 })
          .limit(3)
          .toArray();
        res.json(artifacts);
      } catch (error) {
        res.status(500).send(error);
      } finally {
        // client.close();
      }
    });

    app.delete("/artifact/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artifactCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/artifact/:userEmail", verifytoken, async (req, res) => {
      const email = req.params.userEmail;
      const query = { email: email };
      if (req.user.email !== email) {
        return res
          .status(403)
          .send({ message: "forbidden accees dure giya mor" });
      }
      const cursor = artifactCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // Update artifact endpoint
    app.put("/artifacts/:id", verifytoken, async (req, res) => {
      const id = req.params.id;
      const updatedArtifact = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedArtifact };
      const result = await artifactCollection.updateOne(filter, updateDoc);
      if (result.modifiedCount === 0) {
        return res.status(404).send({ message: "Artifact not found" });
      }
      res.send(result);
    });

    app.post("/artifacts", async (req, res) => {
      const newArtifact = req.body;
      console.log(newArtifact);
      const result = await artifactCollection.insertOne(newArtifact);
      res.send(result);
    });

    app.get("/artifacts", async (req, res) => {
      const cursor = artifactCollection.find();
      const result = await cursor.toArray();
      res.send(result);
      console.log(result);
    });

    // for searching
    app.get("/searchArtifact", async (req, res) => {
      const query = req.query.q;
      const visas = await artifactCollection
        .find({ artifactName: { $regex: query, $options: "i" } })
        .toArray();
      res.json(visas);
    });

    // visa related apis
    app.get("/visas", async (req, res) => {
      const cursor = visaCollection.find();
      const result = await cursor.toArray();
      res.send(result);
      console.log(result);
    });
    app.post("/visas", async (req, res) => {
      const newVisa = req.body;
      console.log(newVisa);
      const result = await visaCollection.insertOne(newVisa);
      res.send(result);
    });

    // nicher eta nia kaj korte hbe
    // app.get("/applyvisa/:userEmail", verifytoken, async (req, res) => {
    //   const email = req.params.userEmail;
    //   const query = { email: email };
    //   if (req.user.email !== email) {
    //     return res
    //       .status(403)
    //       .send({ message: "forbidden accees dure giya mor" });
    //   }
    //   const cursor = appliedVisaCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });
    // app.post("/applyVisas", async (req, res) => {
    //   const newAppliedVisa = req.body;
    //   console.log(newAppliedVisa);
    //   console.log(req.cookies);
    //   const result = await appliedVisaCollection.insertOne(newAppliedVisa);
    //   res.send(result);
    // });
    // app.delete("/myVisaApplication/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await appliedVisaCollection.deleteOne(query);
    //   res.send(result);
    // });

    // // for searching
    // app.get("/search", async (req, res) => {
    //   const query = req.query.q;
    //   const visas = await visaCollection
    //     .find({ countryName: { $regex: query, $options: "i" } })
    //     .toArray();
    //   res.json(visas);
    // });

    // app.get("/visa/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await visaCollection.findOne(query);
    //   res.send(result);
    // });
    // app.get("/visas/:userEmail", verifytoken, async (req, res) => {
    //   const email = req.params.userEmail;
    //   const query = { email: email };
    //   if (req.user.email !== email) {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   const cursor = visaCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });
    // app.put("/visa/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const options = { upsert: true };
    //   const updatedVisas = req.body;

    //   const visa = {
    //     $set: {
    //       countryImage: updatedVisas.countryImage,
    //       countryName: updatedVisas.countryName,
    //       visaType: updatedVisas.visaType,
    //       processingTime: updatedVisas.processingTime,
    //       requiredDocuments: updatedVisas.requiredDocuments,
    //       description: updatedVisas.description,
    //       ageRestriction: updatedVisas.ageRestriction,
    //       fee: updatedVisas.fee,
    //       validity: updatedVisas.validity,
    //       applicationMethod: updatedVisas.applicationMethod,
    //       email: updatedVisas.email,
    //     },
    //   };
    //   const result = await visaCollection.updateOne(filter, visa, options);
    //   res.send(result);
    // });

    // app.delete("/visa/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await visaCollection.deleteOne(query);
    //   res.send(result);
    // });

    // // cofee
    // app.get("/coffee", async (req, res) => {
    //   const cursor = coffeeCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    //   console.log(result);
    // });
    // app.get("/coffee/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await coffeeCollection.findOne(query);
    //   res.send(result);
    // });
    // app.post("/coffee", async (req, res) => {
    //   const newCoffee = req.body;
    //   console.log(newCoffee);
    //   const result = await coffeeCollection.insertOne(newCoffee);
    //   res.send(result);
    // });

    // app.put("/coffee/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const options = { upsert: true };
    //   const updatedCoffee = req.body;

    //   const coffee = {
    //     $set: {
    //       name: updatedCoffee.name,
    //       chef: updatedCoffee.chef,
    //       supplier: updatedCoffee.supplier,
    //       taste: updatedCoffee.taste,
    //       category: updatedCoffee.category,
    //       details: updatedCoffee.details,
    //       photo: updatedCoffee.photo,
    //     },
    //   };
    //   const result = await coffeeCollection.updateOne(filter, coffee, options);
    //   res.send(result);
    // });

    // app.delete("/coffee/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await coffeeCollection.deleteOne(query);
    //   res.send(result);
    // });

    // Users related apis
    app.get("/users", verifytoken, async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
      console.log(req.cookies);
    });
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.patch("/users", async (req, res) => {
      const email = req.body.email;
      const filter = { email };
      const updatedLoginTime = {
        $set: {
          lastSignInTime: req.body?.lastSignInTime,
        },
      };
      const result = await userCollection.updateOne(filter, updatedLoginTime);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ghjhhjkk");
});
app.listen(port, () => {
  console.log(`jknkj at ${port}`);
});
