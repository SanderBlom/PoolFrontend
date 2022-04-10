
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
let game = require("./game.js") //Used to access the database functions
const moment = require('moment'); //Used to generate timestamps



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
app.use(passport.initialize()); //Starting passport to keep track of our users
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
//If user is logged in and tries to access login or register they will be redirected to their homepage
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

app.get("/user/dashboard", checkAuth, async (req, res) => {
    var userid = req.user.userid
    var username = req.user.username
    var firstname = req.user.firstname
    var lastname = req.user.lastname
    var email = req.user.email
    let wl = await db.PersonalStatsWL(userid) //Fetches your win/loss ratio form the database
    let avwl = await db.AvrageStatsWL()//Fetches the average win/loss ratio form the database
    var ingame = await db.IsUserInAGame(userid) //Checks if the user is in an active game
    let previousgames = await db.GetPreviousGameList(userid) //Get an array of gameids where the user has played 
    var gameid = null
    if (ingame == true) {
        gameid = await db.GetGameIDForActiveGame(userid)
        res.render("profile", {
            username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage'),
            personalWL: wl, averagewl: avwl, gamelist: previousgames
        })

    }
    else {
        res.render("profile", {
            username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage'),
            personalWL: wl, averagewl: avwl, gamelist: previousgames
        })
    }
})

app.post("/game/previous/", checkAuth, async (req, res) => {
    let { gameid } = req.body
    console.log(gameid)
    const userid = await req.user.userid

    let validate = await db.ValidateGameAccess(userid, gameid) //We validate that the user has access to the requested game
    if (validate) {
        console.log('You have access')
        res.redirect(`/game/previous/${gameid}`)
    }
    else {
        console.log('You dont have access to watch other users games')
    }

})

app.get("/game/previous/:id", checkAuth, async (req, res) => {
    let gameid = req.params.id.trim()
    let userid = await req.user.userid
    let username = req.user.username
    let validate = db.ValidateGameAccess(userid, gameid)
    let player1Username = null//This stores player1 name 
    let player2Username = null//This stores player2 name 
    let error
    let time
    let balls = []
    let usernames
    let winner = null
    let loser = null
    if (validate) {

        try {
            winner = await db.GetGameWinner(gameid) //Gets the winner of the game. Return null if no winner is found
            loser = await db.GetGameLoser(gameid) //Gets the loser of the game. Return null if no loser is found
            balls = await db.GetAllBallPositions(gameid) //Fetches all the ball positions from the database
            time = await db.TotalGameTime(gameid) //Fetches minutes since game started
            gamestatus = await db.IsGameActive(gameid)// Checking if the game is active. This returns true or false
            usernames = await db.fetchUsernamesInGame(gameid)
            player1Username = usernames[0]
            player2Username = usernames[1]


        } catch (err) {
            error = err

        }
        if (error) {
            res.status(400).send(`Problems fetching gamedata. <a href="/">Go back</a> ` + error)
        }
        
        else {
            try {
                let images = await game.renderwholegame(balls)
                    res.render('previousgame', {
                        message: req.flash('message'), username, user: userid, title: 'test', images: images, gameid: gameid,
                        constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner, loser: loser
                    })

            } catch (error) {
                console.log('User is not probably not logged in' + error)
            }
        }

    }
    else {
        req.flash('gamemessage', `Looks like you dont have access to this game.`)
        res.redirect("/user/dashboard")
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
app.post("/game/create", checkAuth, async (req, res) => {
    const tableid = await req.body.tableid.trim()
    const userid = await req.user.userid
    var tableAvailability = false;
    var gameid = null

    try {
        tableAvailability = await vision.CheckTableAvailability(tableid)  //Checks the tableid the user has submited, and ask the visionsystem if the table is available 
    } catch (error) {
        console.log(error)
    }

    if (tableAvailability == true) {
        gameid = await db.CreateNewGame(tableid) //Creating a game and returning the game id.
    }

    else {
        req.flash('gamemessage', `Looks like the table is already in use or does not exsist.`)
        res.redirect("/user/dashboard")
    }

    if (gameid != null) {
        var result = await db.JoinGame(gameid, userid)
        if (result == true) {
            req.flash('message', `Please give your opponent the game ID so they can join.`)
            res.redirect(`/game/${gameid}`)
        }
        else {
            req.flash('gamemessage', `Could not create a new game. Please contact staff`)
            res.redirect("/user/dashboard")
        }
    }
})

app.post("/game/cancel/:id", checkAuth, async (req, res) => {
    //This should only be trigged while waiting for a game start.
    //Here we should add some validation that only users in the game can cancel the game!!
    var gameid = req.params.id.trim();
    try {
        db.CancelGame(gameid)
    } catch (error) {
        req.flash('gamemessage', 'Could not cancel your game with gameID:' + gameid)
        res.redirect("/user/dashboard")
    }


    req.flash('gamemessage', 'Canceled game with gameid:' + gameid)
    res.redirect("/user/dashboard")
})

app.post("/game/start/:id", checkAuth, async (req, res) => {
    var gameid = req.params.id.trim(); //Getting gameid from url
    let { username1, username2 } = req.body //Getting usernames from post request.
    var username = await req.user.username //Getting logged in users username
    var tablestatus //Stores the table status. This should be true if there are no active games on the table.
    var tableid

    //Checks that the game is not allready started
    let gamestatus = await db.IsGameActive(gameid)
    if (gamestatus == true) {
        res.redirect(`/livegame/${gameid}`)
    }
    else {
        let playerids = await db.GetPlayerIDinGame(gameid)
        var playerid1 = playerids[0]
        var playerid2 = playerids[1]
        if ((username == username1) || (username == username2)) //Checks that the logged in user is one of the players in the game 
        {
            const timestamp = moment() //Creating timestamp in millisec
            const timestampFormated = timestamp.format('YYYY-MM-DDTHH:mm:SS') //Formats data into a format that matches with C# Timestamp format.
            tableid = await db.GetTableID(gameid) //Fetches the tableid for the game
            tablestatus = await vision.CheckTableAvailability(tableid) //Checks that nobody has started a game on the same table.
            if (tablestatus == true) {
                //console.log('Gameid= ' + gameid + ' pID 1= ' + playerid1 + ' pID 2=' + playerid2 + ' usrName1= ' + username1 + ' usrName2= ' + username2 + 'timestamp ' + timestampFormated)
                let result = await vision.SendStart(gameid, playerid1, playerid2, username1, username2, timestampFormated) //Send data to API to check. Returns HTTP status codes

                if (result == 200) {
                    var creategame = await db.StartGame(gameid)
                    if (creategame == true) {
                        res.redirect(`/livegame/${gameid}`)
                    }
                    else {
                        //We should add a stop game API call here.
                        req.flash('gamemessage', 'Could not start the game')
                        res.redirect("/user/dashboard")
                    }

                }
                else {
                    req.flash('gamemessage', 'Error in response from API')
                    res.redirect("/user/dashboard")
                }
            }
            else if (tablestatus == false) {
                req.flash('gamemessage', 'Table is already in use.')
                res.redirect("/user/dashboard")
            }
            else {
                req.flash('gamemessage', 'No response from API')
                res.redirect("/user/dashboard")
            }
        }

        else {
            //If the user trying to start the game is not one of the users that plays. Redirect him back to his profile.
            console.log('Dont active')
            req.flash('gamemessage', 'Looks like your not a part on the game...')
            res.redirect("/user/dashboard")
        }



    }


})
app.get("/game/:id", checkAuth, async (req, res) => {
    var gameid = req.params.id.trim();
    var gamestartedstatus
    var username1 = null
    var username2 = null
    var username = req.user.username // fetching username to use in the navbar
    let error = null
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
        if (username1 != null && username2 != null) {
            gamestartedstatus = await db.IsGameActive(gameid)

        }
    }
    catch (err) {
        error = err
    }
    if (error) {
        res.sendStatus(404).send(`Could not get the game details..<a href="/">Go back</a> `)
    }
    else {
        if (username1 == null && username2 == null) {
            console.log('User is not logged in or is not a member of the gameid')
            res.redirect("/login")
        }
        else if (req.user) {
            if (username != username1 && username != username2) {
                //If user is not a part of the game they should be redirected 
                res.sendStatus(404).send(`Looks like your not supposed to be here...<a href="/">Go back</a> `)
            }
            else {
                var userid = req.user.userid
                res.render('gameWizard', { message: req.flash('message'), username, username1, username2, user: userid, gameid, title: 'game', tableid, gamestatus: gamestartedstatus })
            }

        }


        else {
            res.redirect("/login")
        }
    }
})

//This page loads after you have picked a table and the system has checked that its not in use.
app.get("/game/create/:id", checkAuth, (req, res) => {
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
app.get("/scoreboard", async (req, res) => {
    let data = await db.Top25WL()
    let usernames = []
    let wl = []
    for (let index = 0; index < data.length; index++) {
        //Adds usernames and win/loss ratio to two arrays
        var name = data[index].username
        //name = await addQuotes(name)
        usernames.push(name)
        wl.push(data[index].wl)

    }
    //Sorting array from high to low
    //Adding the data into one array
    var Data = [];
    for (let i = 0; i < usernames.length; ++i) {
        Data.push({
            label: usernames[i],
            data: wl[i]
        });
    }

    // Sorting the array based on the W/L ratio (dec)
    Data.sort((a, b) => parseFloat(b.data) - parseFloat(a.data));

    //Splittng the data into two arrays.
    var sortedLabels = Data.map(e => e.label);
    var sortedData = Data.map(e => e.data);

    try {
        if (req.user) {
            var userid = req.user.userid
            var username = req.user.username
            var firstname = req.user.firstname
            var lastname = req.user.lastname
            res.render('statistics', { message: req.flash('message'), username, user: userid, title: 'scoreboard', Usernames: sortedLabels, WL: sortedData }) //Renderes the statistic websites and passes title for the navbar
        }
        else {
            var userid = null
            var username = null
            res.render('statistics', { message: req.flash('message'), username: username, user: userid, title: 'scoreboard', Usernames: sortedLabels, WL: sortedData }) //Renderes the statistic websites and passes title for the navbar
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

app.get("/tournament/new", checkAuth, (req, res) => {
    let username = req.user.username
    var userid = null //need this for some reason
    console.log(username)
    res.render('tournamentWizard', { message: req.flash('message'), username: username, user: userid, title: 'tournament' }) //Renderes the index websites and passes title for the navbar




})

app.post("/tournament/new", checkAuth, async (req, res) => {

    let tournament = req.body //Gets body from POST
    let tournamentName = tournament.TournamentName //storing tournament name
    let usernames = tournament.usernames //array of usernames to add to tournament
    let tournamentID = await db.CreateNewTournament(tournamentName)
    let invalidusernames = []
    for (let index = 0; index < usernames.length; index++) {
        const username = usernames[index];
        let validation = await db.ValidateUniqueUsername(username) //Checks if the username exist in the db

        if (validation == true) {
            //If username is not found in the db is added to the invalidusername array
            invalidusernames.push(username)
        }

    }
    console.log(invalidusernames)

    if (invalidusernames.length != 0) {
        //Cheks that we dont have any invalid usernames
    }

})
app.post("/livegame", async (req, res) => {
    //This just forwards the users search to the correct page.
    let { gameid } = req.body
    res.redirect(`/livegame/${gameid}`)
})

app.get("/livegame/:id", async (req, res) => {
    var gameid = req.params.id.trim(); //Fetches game id from url
    var userid = null
    var username = null
    var player1Username = null//This stores player1 name 
    var player2Username = null//This stores player2 name 
    let error
    let time
    let balls
    let usernames
    let gamestatus
    let winner = null
    try {
        winner = await db.GetGameWinner(gameid) //Gets the winner of the game. Return null if no winner is found
        balls = await db.latestBallPosition(gameid) //Fetches last ball positions from the database
        time = await db.TimePlayed(gameid) //Fetches minutes since game started
        gamestatus = await db.IsGameActive(gameid)// Checking if the game is active. This returns true or false

        if (gamestatus == true) {
            usernames = await db.fetchUsernamesInGame(gameid)
            player1Username = usernames[0]
            player2Username = usernames[1]
        }

    } catch (err) {
        error = err

    }
    if (error) {
        res.status(400).send(`Problems fetching gamedata. <a href="/">Go back</a> ` + error)
    }

    else {
        try {
            if (req.user) {
                var userid = req.user.userid
                var username = req.user.username
                game.renderballs(balls)
                    .then((image) => res.render('game', {
                        message: req.flash('message'), username, user: userid, title: 'test', gameimage: image, gameid: gameid,
                        constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner
                    }))

            }
            else {
                var userid = null
                var username = null
                game.renderballs(balls)
                    .then((image) => res.render('game', {
                        message: req.flash('message'), username, user: userid, title: 'test', gameimage: image, gameid: gameid,
                        constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner
                    }))

            }

        } catch (error) {
            console.log('User is not probably not logged in' + error)
        }
    }


})

//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//