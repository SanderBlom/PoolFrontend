
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
const poolAPIObj = require("./PoolAPI")
const DB = require("./DB")


const initializePassport = require("./passport-config");
initializePassport(passport);

app.use(express.static('views'));//Gives express access to views folder 
app.set("view engine", "ejs") //Using EJS av view engine 
app.use(express.urlencoded({ extended: false }))

app.use(
    session({
        
        secret: process.env.SESSION_SECRET,//Encryption key for our sessions. This should probably be autogenrated for each session?
        
        resave: false,
        
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
    else {
        res.redirect("/login")
    }
}

function checkNotAuth(req, res, next) {
    if (req.user) {
        res.redirect("/user/dashboard")
    }
    else {
        next()
    }
}
//Using passport to keep track of logged in users
/* const initializePassport = require('./passport-cfg')
initializePassport(
    passport,
    username => Findusername(username),
    id => Finduserid(id)
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

    res.render("login", { title: 'login', message: req.flash('message') })
})
//Function to fetch login credentials and potentially login the user.The checkNotAuth is middleware to check if the usr/pw is valid
app.post("/login", checkNotAuth, passport.authenticate('local', {
    successRedirect: '/user/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}))
//function to get the homepage 
app.get("/", async (req, res) => {
    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            res.render('index', { message: req.flash('message'), username, user: userid, title: 'index' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('index', { message: req.flash('message'), username: username, user: userid, title: 'index' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }
})

//function to get the register page
app.get("/register", checkNotAuth, (req, res) => {

    res.render('register', { message: req.flash('message'), title: 'register' }) //Renders the register websites and passes different variables for flash message and title for navbar
})

app.post("/register", checkNotAuth, async function (req, res) {
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
    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            var firstname = req.user.firstname
            var lastname = req.user.lastname
            res.render('live-table', {
                message: req.flash('message'), username, user: userid, title: 'live',
                constatus: APIstatus, player1Name, player2Name, player1Score, player2Score
            }) //Renderes the index websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('live-table', {
                message: req.flash('message'), username: username, user: userid, title: 'live',
                constatus: APIstatus, player1Name, player2Name, player1Score, player2Score
            }) //Renderes the index websites and passes title for the navbar
        }
    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }
})

app.get("/user/dashboard", checkAuth, async (req, res) => {
    var userid = req.user.userid
    var username = req.user.username
    var firstname = req.user.firstname
    var lastname = req.user.lastname
    var email = req.user.email
    res.render("profile", { username: username, user: userid, firstname, lastname, email, message: req.flash('message') })
})

app.post("/user/dashboard", checkAuth, async (req, res) => {
    let { username, firstname, lastname, email } = req.body
    const id = req.user.userid
    const query = `UPDATE public.users SET firstname = $1, lastname = $2, email = $3
	WHERE id = $4;`
    const values = [`${firstname}`, `${lastname}`, `${email}`, id]


    try {

        await pool.query(query, values)
    } catch (err) {
        console.log(err.stack)
    }
    req.flash('message', `Data updated!`)
    res.redirect("/user/dashboard", )
})
//Fetches the scoreboard
app.get("/scoreboard", (req, res) => {
    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            var firstname = req.user.firstname
            var lastname = req.user.lastname
            res.render('statistics', { message: req.flash('message'), username, user: userid, title: 'scoreboard' }) //Renderes the statistic websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('statistics', { message: req.flash('message'), username: username, user: userid, title: 'scoreboard' }) //Renderes the statistic websites and passes title for the navbar
        }

    } catch (error) {

        console.log(error)

    }
})

app.get("/rules", (req, res) => {

    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            res.render('rules', { message: req.flash('message'), username, user: userid, title: 'rules' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('rules', { message: req.flash('message'), username: username, user: userid, title: 'rules' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})

app.get("/tournament/new", (req, res) => {

    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            res.render('tournamentWizard', { message: req.flash('message'), username, user: userid, title: 'tournament' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('tournamentWizard', { message: req.flash('message'), username: username, user: userid, title: 'tournament' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})
//This is taking the submitted tableid from users dashboard and checks if the table is free. If its free user will be redirected the new game page.
app.post("/user/dashboard/newgame", checkAuth, async (req, res) => {
    const tableid = await req.body.tableid.trim()
    var tableAvailability = false;
    console.log(tableid)

    try {
        tableAvailability = await poolAPIObj.CheckTableAvailability(tableid) //Checks the tableid the user has submited, and ask the visionsystem if the table is available 
        
    } catch (error) {
        console.log(error)
    }

    if (tableAvailability == true){
        console.log("The requested table is free :)")
        res.redirect(`/user/dashboard/newgame/${tableid}`)
    }

    else{
        req.flash('message', `Looks like the table is already in use. Please select another table.`)
        res.redirect("/user/dashboard")
    }
})


//This page loads after you have picked a table and the system has checked that its not in use.
app.get("/user/dashboard/newgame/:id", checkAuth, (req, res) => {
    var tableid = req.params.id.trim();
    console.log("test")
    var player2Username //Defining username to incase the post request is not valid. 
    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            res.render('gameWizard', { message: req.flash('message'), username, player2Username, user: userid, title: 'game', tableid })
        }
        else {
            res.redirect("/login") 
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})

//This for the POST request after the user has submitted the the two players username. 
app.post("/user/dashboard/newgame/:id", checkAuth, (req, res) => {
    var tableid = req.params.id.trim();
    let {username, player2Username} = req.body

    if(username == player2Username){
        req.flash('message', `Nice try, but you can't play against yourself. Please input another username`)
        res.redirect(`/user/dashboard/newgame/${tableid}`, username, player2Username)
    }

    else{
        console.log('Whalla')
    }

})



//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//