
var express = require('express'); //Web server
var session = require('express-session') //Used to keep track of sessions
var flash = require('express-flash')//Used for flash messages
var app = express();
const PORT = 3000 //Ports that the server will listen to.
// Changing the view engine to ejs
app.set('view engine', 'ejs');

//Gives express access to views foler 
app.use(express.static('views'));
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 }
}))

app.use(flash()) //Used for flash messages
app.get("/", function (req, res){

    var APIstatus = false

    res.render('index', {message: req.flash('message'), title: 'index', constatus: APIstatus})
})
//-------------------------------------Start server-------------------------------------//
//starts server on port 3000
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}. Time & Date = ` + new Date().toString());
});
//-------------------------------------End server-------------------------------------//