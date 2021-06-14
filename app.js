require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const app = express();

const port = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: true
    });

const usersSchema = new mongoose.Schema ({
    email: String,
    password: String
});

const secret = process.env.SECRET;

usersSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = new mongoose.model("User", usersSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/register", (req, res) => {

    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save((err) => {
        if (err) {
            console.log(err);
        }
        else {
            res.render("secrets");
        }
    });

});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username}, (err, foundUser) => {
        if (err) {
            console.log(err);
        }
        else {
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render("secrets");
                }
                else {
                    res.send("You Fool 😈 Don't try to hack me.");
                }
            }
            else {
                console.log("User not found!");
            }
        }
    })
    
});

app.listen(port, (req, res) => {
    console.log(`Server started at port ${port}`);
})