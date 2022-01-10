
var express = require('express'); //Web server
var session = require('express-session') //Used to keep track of sessions
var flash = require('express-flash');//Used for flash messages
const { pool } = require('./dbConfig');
const passport = require('passport') //Lib to keep track of logged in users
require('dotenv').config(); //Used to store passwords. This should not be uploaded to github :) 
var app = express();
const PORT = 3000 //Ports that the server will listen to.
// Changing the view engine to ejs
app.set('view engine', 'ejs');


//Function to find username for passport
async function Findusername(username) {

    try {
        let data = await pool.query(`SELECT username, password FROM users WHERE username = '${username}';`)
        let result = []
        
        var username = data.rows[0].username
        var password = data.rows[0].password
        result.push({"username": username, "password": password})
    
        return result
        
    } catch (error) {

        console.log(error)
        
    }
  


}

function FinduserId(pk) {

    let result = pool.query(`SELECT pk FROM users WHERE pk = ${pk};`)
    return result.rows[0].username


}

async function test(){
    result = await Findusername('test')

    console.log(result)
}

test()




//Using passport to keep track of logged in users
const initializePassport = require('./passport-cfg')

initializePassport(
    passport,
    username => Findusername(username),
    id => pkid = FinduserId(pk) === id

) //Running the passport function from passport-cfg file

//Dette er sikkert lite veldig lite sikker så her må vi mulig gjøre noe.


const bcrypt = require('bcrypt'); //This is used to hash password and check hashes so we dont store the passwords in plain text

//Gives express access to views folder 
app.use(express.static('views'));
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    //cookie: { maxAge: 60000 }
}))

app.use(flash()) //Used for flash messages

app.use(passport.initialize())
app.use(passport.session())




//function to get the homepage 
app.get("/", function (req, res) {
    var APIstatus = false
    //Names of current players
    var player1Name = "Sander"
    var player2Name = "Amanuel"
    //Current scores
    var player1Score = 2
    var player2Score = 4

    res.render('index', {
        message: req.flash('message'), title: 'index', constatus: APIstatus,
        player1Name, player2Name, player1Score, player2Score
    }) //Renderes the index websites and passes different variables and objects to use in frontend
})

//function to get the register page
app.get("/register", function (req, res) {

    res.render('register', { message: req.flash('message'), title: 'register' }) //Renders the register websites and passes different variables for flash message and title for navbar
})


app.post("/register", async function (req, res) {
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
            const hashedPassword = await bcrypt.hash(pwd, 10)
            await pool.query(`INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ('${username}', '${firstname}', '${lastname}', '${email}', '${hashedPassword}');`)
        }
        catch (error) {
            res.status(404, `Could not complete the database query. Error: ${error}`)
        }
        req.flash('messagesuccess', `You are now registered and can login!`)
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
//function to get the login page
app.get("/login", (req, res) => {
    res.render("login", { message: req.flash('message'), messagesuccess: req.flash('messagesuccess'), title: 'register' })
})

app.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true


}))
//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//