const LocalStrategy = require('passport-local').Strategy //Local strategy. Other options could be login with google, facebook, etc
const bcrypt = require('bcrypt') //Require becrypt to check hashes against user password 

function initialize(passport, getUserByUsername, getUserById){
    const authenticateUser =  async (username, password, done) => {
        const user = await getUserByUsername(username) 
        if (user == null) {
            return done(null, false, {message: 'No user with that username'})
        }

        console.log('username:' + user[0].username)
        console.log('pw:' + user[0].password)

        try{
            if (await bcrypt.compare(password, user[0].password)) {
                return done(null, user)

            } else {
                console.log('Did not match')
                return done(null, false, {message: 'Incorrect password'})
            }

        } catch (error){
            return done(error)
        }

    }

    passport.use(new LocalStrategy({usernameField: 'username', passwordField: 'pwd' }, 
    authenticateUser))
    passport.serializeUser((user, done) => done(null, user[0].id))
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize