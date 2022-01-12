
const express = require('express'); //Web server
const session = require('express-session') //Used to keep track of sessions
const flash = require('express-flash');//Used for flash messages
const methodOverride = require('method-override')
const { pool } = require('./dbConfig');
const passport = require('passport') //Lib to keep track of logged in users
const bcrypt = require('bcrypt'); //This is used to hash password and check hashes so we dont store the passwords in plain text
require('dotenv').config(); //Used to store passwords. This should not be uploaded to github :) 
var app = express();
const PORT = 3000 //Ports that the server will listen to.
app.set('view engine', 'ejs'); // Changing the view engine to ejs


const initializePassport = require("./passport-config");
initializePassport(passport);

app.use(express.static('views'));//Gives express access to views folder 
app.set("view engine", "ejs") //Using EJS av view engine 
app.use(express.urlencoded({ extended: false }))

app.use(
    session({
        // Key we want to keep secret which will encrypt all of our information
        secret: process.env.SESSION_SECRET,
        // Should we resave our session variables if nothing has changes which we dont
        resave: false,
        // Save empty value if there is no vaue which we do not want to do
        saveUninitialized: false
    })
);
// Funtion inside passport which initializes passport
app.use(passport.initialize()); //Staring passport to keep track of our users
app.use(passport.session());// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(flash()); //Used for to display flash messages to the frontend
app.use(flash()) //Used for flash messages
app.use(methodOverride('_method')) //used for triggering .delete functions with posts function in html


//Checks if user is logged in.
function checkAuth(req, res, next) {
    if (req.user) {
        console.log('Is authenticated')
        return next()
    }
    else{
        res.redirect("/login")
    }
}

function checkNotAuth(req, res, next) {
    if (req.user) {
       res.redirect("/user/dashboard")
    }
    else{
        next()
    }
}
//Using passport to keep track of logged in users
/* const initializePassport = require('./passport-cfg')
initializePassport(
    passport,
    username => Findusername(username),
    id => FinduserId(id)
)  *///Running the passport function from passport-cfg file

//Dette er sikkert lite veldig lite sikker så her må vi mulig gjøre noe.


app.delete('/logout', (req, res) => {
    req.logOut()
    console.log('Trying to log you out')
    req.flash('message', "You have logged out")
    res.redirect("/")
})

//function to get the login page
app.get("/login", checkNotAuth, (req, res) => {

    res.render("login", { title: 'login', message: req.flash('message')})
})

app.post("/login", checkNotAuth, passport.authenticate('local', {
    successRedirect: '/user/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}))
//function to get the homepage 
app.get("/", async (req, res) => {

    
    try {
        if(req.user){
            var userid = req.user.id 
            var username = req.user.username
            var firstname = req.user.firstname
            var lastname = req.user.lastname
            res.render('index', {message: req.flash('message'), username, user: userid, title: 'index'}) //Renderes the index websites and passes title for the navbar
    
        }
        else{
            var userid = null
            var username = null
            res.render('index', {message: req.flash('message'), username: username, user: userid, title: 'index'}) //Renderes the index websites and passes title for the navbar
        }
    
        
    } catch (error) {

        console.log(error)
        
    }
   

    console.log('Login req user' + req.user) 
    
})

//function to get the register page
app.get("/register", checkNotAuth, (req, res) => {

    res.render('register', { message: req.flash('message'), title: 'register' }) //Renders the register websites and passes different variables for flash message and title for navbar
})

app.post("/register", checkNotAuth,  async function (req, res) {
    let { username, firstname, lastname, email, pwd, repwd } = req.body
    let usernameresponse //Respons from database checking the username. The .length parameter should be 0 if there are no other users with the same username.
    let emailresponse //Same as the one above just with the email address

    const queryUsername = `SELECT * FROM public.users WHERE username = '${username}';` //query to check if the username is in use.
    const queryEmail = `SELECT * FROM public.users WHERE email = '${email}';` //query to check if email is in use.
    //const adduserquery = `INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ('${username}', '${firstname}', '${lastname}', '${email}', '${hashedPassword}');` //query to insert the new user

    try {
        emailresponse = await pool.query(queryEmail)
        usernameresponse = await pool.query(queryUsername)

    } catch (error) {

        res.status(404, `Could not complete the database query. Error: ${error}`)
    }

    if ((usernameresponse.rows.length == 0) && (emailresponse.rows.length == 0)) {
        //Both email and username is uniqe. Lets let the user create the account.

        try {
            const hashedPassword = await bcrypt.hash(pwd, 10) //Hashing the password
            await pool.query(`INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ('${username}', '${firstname}', '${lastname}', '${email}', '${hashedPassword}');`) //Inserting data into the db
        }
        catch (error) {
            res.status(404, `Could not complete the database query. Error: ${error}`)
        }
        req.flash('message', `You are now registered and can login!`)
        res.redirect("login")
    }

    else if ((usernameresponse.rows.length != 0) || (emailresponse.rows.length != 0)) {
        var emailerror = 'Looks like your email is already in use'
        var usernameerror = 'Looks like your username is already in use'
        var usernameandemailerror = 'Looks like both email and username is already in use'

        if ((usernameresponse.rows.length != 0) && (emailresponse.rows.length != 0)) {
            //This should be triggered if both username and email is already registerd 
            req.flash('message', usernameandemailerror)
            res.redirect("register")
        }

        if (usernameresponse.rows.length > 0) {
            req.flash('message', usernameerror)
            res.redirect("register")
        }

        if (emailresponse.rows.length > 0) {
            req.flash('message', emailerror)
            res.redirect("register")
        }
        else {
            res.status(404, 'Not sure what you did here but something broke.')
        }
    }


})

app.get("/live/table/:id", (req, res) => {
    var APIstatus = false
    //Names of current players
    var player1Name = "Sander"
    var player2Name = "Amanuel"
    //Current scores
    var player1Score = 2
    var player2Score = 4
    res.render('live-table', {
        title: 'index', constatus: APIstatus,
        player1Name, player2Name, player1Score, player2Score
    })
})

app.get("/user/dashboard",  checkAuth, async (req, res) => {
    var userid = req.user.id 
    var username = req.user.username
    var firstname = req.user.firstname
    var lastname = req.user.lastname

    console.log(userid + username + firstname + lastname) 
    res.render("profile", {username: username, user: userid, message: req.flash('message')})
})

app.get("/statistics", (req, res) => {
    res.render("statistics")
})
//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//