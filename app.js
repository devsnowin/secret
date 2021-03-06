require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

const port = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true,
    useCreateIndex: true
});

const usersSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = new mongoose.model("User", usersSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}}, (err, foundUsers) => {
        if (err) {
            console.log(err);
        }
        else {
            if (foundUsers) {
                res.render("secrets", {userWithSecret: foundUsers});
            }
        }
    });
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    }else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

app.route('/auth/google')

  .get(passport.authenticate('google', {

    scope: ['profile']

  }));

app.get('/auth/google/secrets',
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
          res.redirect('/secrets');
      });

app.post("/register", (req, res) => {

User.register({username: req.body.username}, req.body.password, (err, user) => {
    if (err) {
        console.log(err);
        res.redirect("/register");
    }else {
        passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
        });
    }
});

});

app.post("/login", (req, res) => {

    const newUser = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(newUser, (err) => {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });

});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        }
        else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    });

});

app.listen(port, (req, res) => {
    console.log(`Server started at port ${port}`);
})
