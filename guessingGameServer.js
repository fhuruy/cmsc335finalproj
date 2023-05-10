const path = require("path");
require("dotenv");

const express = require("express");   /* Accessing express module */
const app = express();  /* app is a request handler function */
const bodyParser = require("body-parser");
/* Module for file reading */
const fs = require("fs");
process.stdin.setEncoding("utf8");

if (process.argv.length != 2) {
    process.stdout.write(`Usage guessingGameServer.js \n`);
    process.exit(1); 
}

const portNumber = 4000;
let player = "";
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.listen(portNumber);
console.log(`Web server started and running at https://vast-lime-buffalo-coat.cyclic.app`);
const url = `https://vast-lime-buffalo-coat.cyclic.app`;
const prompt = "Type stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
  let dataInput = process.stdin.read();
  if (dataInput !== null) {
    let command = dataInput.trim();
    if (command === "stop") {
      console.log("Shutting down the server");
      process.exit(0);
    }
    process.stdout.write(prompt);
    process.stdin.resume();
  }
});

/*const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;*/

const userName = "fhuruy";
const password = "spr2023testudo";
const db = "Users";
const collection = "accountInfo";

 /* Our database and collection */
 const databaseAndCollection = {db: db, collection: collection};


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.bcvsvdg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function insertApplication(client, databaseAndCollection, newApp) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApp);
}

/* These insert functions inserts a user's username, password, and balance into the MongoDB database */
async function insertIntoDB(client, databaseAndCollection, newUser) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newUser);
}

async function insertUser(client, databaseAndCollection, userName, passWord, bal) {
    try {
        await client.connect();
        let user = {username: userName, password: passWord, balance: bal};
        await insertIntoDB(client, databaseAndCollection, user);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

/* checking if the given username is in the database */
async function lookUpUsername(client, databaseAndCollection, userName) {
    let filter = {username: userName};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
   return result;
}

/* checking if the given password is in the database */
async function lookUpPassword(client, databaseAndCollection, passWord) {
    let filter = {password: passWord};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
   return result;
}

/* checking if the balance of the given user */
async function lookUpBalance(client, databaseAndCollection, name) {
    let filter = {username: name};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
   return result?.balance;
}

/* updates the balance field of the given user to the specified amount */
async function updateBalance(client, databaseAndCollection, userName, amount) {
    let filter = {username: userName};
    let person = await lookUpUsername(client, databaseAndCollection, userName);
    let bal = 0;
    if (person) {
        bal = person.balance + amount
        
    
    // update the value of the 'balance' field to amount
    const updateDocument = {
        $set: {
        balance: bal,
        },
    };
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .updateOne(filter, updateDocument);
    } 
}
async function lookUpOneEntry(client, databaseAndCollection, userName) {
    let filter = {name: userName};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
    console.log(result);
    return result;
}
let currUser = null;
app.get("/", (request, response) => {
    currUser = null;
    response.render("guessingGame", {});
});

app.get("/login", (request, response) => {
    let link = url + `/loggedin`; 
    let vars = {link: link};
    response.render("login", vars);
});

app.post("/loggedin", async (request, response) => {
    const userName = request.body.username;
    currUser = userName;
    const passWord = request.body.password;
    let vars;
    try {
        await client.connect();
        let user = await lookUpUsername(client, databaseAndCollection, userName);
        let passW = await lookUpPassword(client, databaseAndCollection, passWord);
        if (user && passW) {
            player = userName;
            vars = {issue: `Welcome Back!`, 
                    loggedin: `Logged in as <em>${user.username}</em> with a current balance of <em>${user.balance}</em>`,
                    redirect:`<a href='/gameStart'>Start Game</a>`}; 
        } else {
            vars = {issue: `Username and/or Password is incorrect, please try logging in again.`, 
                    loggedin: ``,
                    redirect:`<a href='/login'>Login Page</a>`}; 
        }
        response.render("loggedin", vars);
    } catch (e) {
        console.error(e);
    } finally {
        //await client.close();
    }
});

app.get("/create", (request, response) => {
    let link = url + `/created`; 
    let vars = {link: link};
    response.render("create", vars);
});

app.post("/created", async (request, response) => {
    let vars;
    let name = request.body.username;
    currUser = name;
    let pass = request.body.password;
    let user = await lookUpUsername(client, databaseAndCollection, name);
    if (user) {
        vars = {issue:`Sorry a user with that name already exists, please try creating an account with a different username.`,
                redirect:`<a href='/create'>Create an Account</a>`}; 
    } else {
        insertUser(client, databaseAndCollection, name, pass, 0);
        vars = {issue:`Account successfully created!`,
                redirect:`<a href='/login'>Login</a>`}; 
    }
    response.render("created", vars);
});

app.get("/gameStart", (request, response) => {
    let link = url + `/answer`; 
    let vars = {link: link};
    response.render("gameStart", vars);
});

app.post("/answer", async (request, response) => {
    let vars;
    let actualAnswer = Math.ceil(Math.random() * 4);
    let userAnswer = Number(request.body.answer);
    let resp = "";
    //let bal = await lookUpBalance(client, databaseAndCollection, player)
    let bal = 1
   
    if (currUser) {
        if (userAnswer < 1 || userAnswer > 4 || Number.isNaN(userAnswer)) {
            vars = {correct: `You entered a value that didn't correspond to an image. Please try again.`,
                    infoAndImages: ``,
                    balance: bal};
        } else {
            if (userAnswer === actualAnswer) {

                resp += `<h3>The image you correctly guessed was (Number ${actualAnswer}):</h3><br>`;
                let image = `/images/image` + `${userAnswer}` + `.jpg`;
                resp += `<img src='${image}'width="220" height= "220"'>`;
                //await updateBalance(client, databaseAndCollection, player, 1);
                //bal = await lookUpBalance(client, databaseAndCollection, player);
                vars = {correct: `Correct! You have great intuition!`,
                        infoAndImages: resp,
                        balance: bal};
            } else {
               
                resp += `<span><h3>The image randomly chosen was (Number ${actualAnswer}): &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
                resp += `But the image you incorrectly guessed was (Number ${userAnswer}): </h3></span><br>`;
                let actualImage = `/images/image` + `${actualAnswer}` + `.jpg`;
                resp += `<img src='${actualImage}'width="220" height= "220"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;
                let userImage = `/images/image` + `${userAnswer}` + `.jpg`;
                resp += `<img src='${userImage}'width="220" height= "220"'>`;
                vars = {correct:`Sorry you were incorrect, your intuition could use some work ): `,
                        infoAndImages: resp,
                        balance: bal};
            }
        }
        response.render("answer", vars);
    }
    
});

