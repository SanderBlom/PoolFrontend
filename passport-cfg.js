const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')



function initialize(passport, getUserByUsername, getUserById){
    const authenticateUser =  async (username, password, done) => {
        const user = await getUserByUsername(username) 
        console.log(user)
        if (user == null) {
            console.log('No user found')
            return done(null, false, {message: 'No user with that username'})
        }

        try{
            console.log('passowrd: ' + password)
            console.log('usr password' + user[0].password)
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)

            } else {
                console.log('Did not match')
                return done(null, false, {message: 'Password did not match'})
            }

        } catch (error){
            return done(error)

        }

    }

    passport.use(new LocalStrategy({usernameField: 'username', passwordField: 'pwd' }, 
    authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize