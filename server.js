
const express = require('express'); //Web server
const session = require('express-session') //Used to keep track of sessions
const flash = require('express-flash');//Used for flash messages
const methodOverride = require('method-override') //Used to override methods.
const passport = require('passport') //Lib to keep track of logged in users
const bcrypt = require('bcrypt'); //This is used to hash password and check hashes so we dont store the passwords in plain text
require('dotenv').config(); //Used to store passwords. This should not be uploaded to github :) 
var app = express();
const PORT = 3000 //Ports that the server will listen to.
app.set('view engine', 'ejs'); // Changing the view engine to ejs
let vision = require("./VisionSystem")
let db = require("./db.js") //Used to access the database functions
let draw = require("./draw.js") //Used to access the database functions



const initializePassport = require("./passport-config");
initializePassport(passport);

app.use(express.static('views'));//Gives express access to views folder 
app.set("view engine", "ejs") //Using EJS av view engine 
app.use(express.urlencoded({ extended: false }))

app.use(
    session({

        secret: process.env.SESSION_SECRET,//Encryption key for our sessions.
        resave: false,
        saveUninitialized: false
    })
);
// Funtion inside passport which initializes passport
app.use(passport.initialize()); //Staring passport to keep track of our users
app.use(passport.session());// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(flash()); //Used for to display flash messages to the frontend
app.use(methodOverride('_method')) //used for triggering .delete functions with posts function in html


//Checks if user is logged in.
function checkAuth(req, res, next) {
    if (req.user) {
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

app.delete('/logout', (req, res) => {
    req.logOut()
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
    //Checks if user is logged in or not
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
})

//function to get the register page
app.get("/register", checkNotAuth, (req, res) => {

    res.render('register', { message: req.flash('message'), title: 'register' }) //Renders the register websites and passes different variables for flash message and title for navbar
})

app.post("/register", checkNotAuth, async function (req, res) {
    let { username, firstname, lastname, email, pwd, repwd } = req.body
    var usernameresponse //Calling function to check if the username is not taken.
    var emailresponse //Calling function to check if the email is not taken.
    var InsertUserResult // Calling function to insert data into the database

    //Checks that the email passes the regex in const emailRegexp.
    //Found the expression at: https://stackoverflow.com/questions/52456065/how-to-format-and-validate-email-node-js
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (emailRegexp.test(email) == false) {
        req.flash('message', 'The email you provided does not pass our email validator. Have you made a typo?')
        res.redirect("register")
    }

    if (pwd == repwd) {
        //Checks if the email and username is already in the database
        try {
            emailresponse = await db.ValidateUniqueEmail(email)
            usernameresponse = await db.ValidateUniqueUsername(username)

        } catch (error) {
            res.send(404, 'Could not check username and email validity')
        }
        if ((usernameresponse == true) && (emailresponse == true)) {
            //Both email and username are unique. Lets let the user create the account.

            try {
                const hashedPassword = await bcrypt.hash(pwd, 10) //Hashing the password
                InsertUserResult = await db.RegisterNewUser(username, firstname, lastname, email, hashedPassword)
            }
            catch (error) {
                console.log(error)
            }
            if (InsertUserResult) {
                req.flash('message', `You are now registered and can login!`)
                res.redirect("register")
            }
            else {
                req.flash('message', `Ops, something went wrong..`)
                res.redirect("register")
            }
        }
        //Checks if email or username is unique.
        else if ((usernameresponse != true) || (emailresponse != true)) {
            var emailerror = 'Looks like your email is already in use'
            var usernameerror = 'Looks like your username is already in use'
            var usernameandemailerror = 'Looks like both email and username is already in use'

            if (usernameresponse == false && emailresponse == false) {
                //This should be triggered if both username and email is already in use. 
                req.flash('message', usernameandemailerror)
                res.redirect("register")
            }

            else if (usernameresponse == false) {
                //This should be triggered if the username is already in use.
                req.flash('message', usernameerror)
                res.redirect("register")
            }

            else if (emailresponse == false) {
                //This should be triggered if the email is already in use.
                req.flash('message', emailerror)
                res.redirect("register")
            }
            else {
                req.flash('message', 'Not sure what you did but something broke')
                res.redirect("register")
            }
        }
    }
    else {
        req.flash('message', 'The password entered did not match.')
        res.redirect("register")
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
    var ingame = await db.IsUserInAGame(userid)
    var gameid = null
    if (ingame == true) {
        gameid = await db.GetGameIDForActiveGame(userid)
        res.render("profile", { username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage') })

    }
    else {
        res.render("profile", { username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage') })
    }

})

app.post("/user/dashboard", checkAuth, async (req, res) => {
    let { username, firstname, lastname, email } = req.body
    const id = await req.user.userid
    let result;

    result = await db.UpdaterUserDetails(firstname, lastname, email, id)

    //Check that the result is true
    if (result == true) {
        req.flash('message', `Data updated!`)
        res.redirect("/user/dashboard")
    }
    else {
        req.flash('message', `Could not update user details..`)
        res.redirect("/user/dashboard")
    }
})

//This is taking the submitted tableid from users dashboard and checks if the table is free. If its free user will be redirected the new game page.
app.post("/user/dashboard/newgame", checkAuth, async (req, res) => {
    const tableid = await req.body.tableid.trim()
    const userid = await req.user.userid
    var tableAvailability = false;
    var gameid = null

    try {
        tableAvailability = await vision.CheckTableAvailability(tableid) //Checks the tableid the user has submited, and ask the visionsystem if the table is available 
    } catch (error) {
        console.log(error)
    }

    if (tableAvailability == "available") {
        gameid = await db.CreateNewGame(tableid) //Creating a game and returning the game id.
    }

    else {
        req.flash('gamemessage', `Looks like the table is already in use or does not exsist.`)
        res.redirect("/user/dashboard")
    }

    if (gameid != null) {
        var result = await db.JoinGame(gameid, userid)
        if (result == true) {
            req.flash('message', `Created a new game! Please give your opponent the game ID so they can join.`)
            res.redirect(`/game/${gameid}`)
        }
        else {
            console.log('Game: ' + gameid + 'Joingame response: ' + result)
            req.flash('gamemessage', `Could not create a new game. Please contact staff`)
            res.redirect("/user/dashboard")
        }
    }
})

app.post("/game/cancel/:id", checkAuth, async (req, res) => {
    //This should only be trigged while waiting for a game start.
    //Here we should add some validation that only users in the game can cancel the game!!
    var gameid = req.params.id.trim();
    db.CancelNonStartedGame(gameid)
    res.redirect("/")
})

app.get("/game/:id", checkAuth, async (req, res) => {
    var gameid = req.params.id.trim();
    var username1 = null
    var username2 = null
    try {
        var tableid = await db.GetTableID(gameid)
        let usernames = await db.fetchUsernamesInGame(gameid) //returns an array with users added to the game
        if (usernames == null) {
            username1 == null
            username2 == null
        }
        else {
            username1 = usernames[0]
            username2 = usernames[1]
        }

        var username = req.user.username // fetching username to use in the navbar

        if (username1 == null && username2 == null) {
            res.redirect("/login")
        }
        if (req.user) {
            var userid = req.user.userid
            res.render('gameWizard', { message: req.flash('message'), username, username1, username2, user: userid, gameid, title: 'game', tableid })
        }
        else {
            res.redirect("/login")
        }
    }
    catch (err) {
        console.log(err)
        res.redirect("/login")
    }
})

//This page loads after you have picked a table and the system has checked that its not in use.
app.get("/user/dashboard/newgame/:id", checkAuth, (req, res) => {
    var tableid = req.params.id.trim();
    console.log("test")
    var player2Username 
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

app.post("/user/dashboard/joingame/", checkAuth, async (req, res) => {
    var gameid = req.body.gameid
    var userid = req.user.userid

    //Validate that the game exsist and has not been started or ended
    var players = await db.CheckPlayerCountInGame(gameid)
    console.log('Amout of players in requested game:' + players)

    if (players >= 2) {
        req.flash('gamemessage', "Looks like the game is full")
        res.redirect("/user/dashboard/")
    }


    else {
        var result = await db.AddPlayerToGame(gameid, userid)
        if (result == true) {
            res.redirect(`/game/${gameid}`)

        }
        else {
            req.flash('gamemessage', "Could not add you to the game. It's either full or does not exsist")
            res.redirect("/user/dashboard/")
        }

    }


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


app.get("/testgame", async (req, res) => {

    var gameid = 2456

    
    const wholeBalls = [
        { tag: "yellow", x: 100, y: 80, color: "yellow", number: 1 },
        { tag: "blue", x: 200, y: 400, color: "blue", number: 2 },
        { tag: "red", x: 500, y: 500, color: "red", number: 3 },
        { tag: "purple", x: 1000, y: 500, color: "purple", number: 4 },
        { tag: "orange", x: 900, y: 200, color: "orange", number: 5 },
        { tag: "green", x: 950, y: 300, color: "#007733", number: 6 },
        { tag: "brown", x: 600, y: 333, color: "brown", number: 7 },
        { tag: "black", x: 444, y: 513, color: "black", number: 8 },
        { tag: "white", x: 1100, y: 80, color: "white", number: null }
    ];
    
    const halfBalls = [
        { tag: "yellow-half", x: 200, y: 80, color: "yellow", number: 9 },
        { tag: "blue-half", x: 250, y: 400, color: "blue", number: 10 },
        { tag: "red-half", x: 300, y: 500, color: "red", number: 11 },
        { tag: "purple-half", x: 800, y: 500, color: "purple", number: 12 },
        { tag: "orange-half", x: 950, y: 200, color: "orange", number: 13 },
        { tag: "green-half", x: 900, y: 300, color: "#007733", number: 14 },
        { tag: "brown-half", x: 650, y: 333, color: "brown", number: 15 }
    ];

    var userid = null
    var username = null
    draw.renderballs(wholeBalls, halfBalls)
    .then((image) => res.render('gametest', { message: req.flash('message'), username, user: userid, title: 'test', gameimage: image }))
   
})
//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//