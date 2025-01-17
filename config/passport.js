const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

module.exports = (db) => {
    passport.use(
        new LocalStrategy(
            {
                usernameField: "email",
                passwordField: "password",
            },
            async (email, password, done) => {
                try {
                    const user = await db.collection("user").findOne({ email });
                    if (!user) return done(null, false, { message: "아이디 DB에 없음" });

                    const isValidPassword = await bcrypt.compare(password, user.password);
                    if (!isValidPassword)
                        return done(null, false, { message: "비번 불일치" });

                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, { id: user._id, username: user.nickname });
    });

    passport.deserializeUser(async (user, done) => {
        const result = await db.collection("user").findOne({ _id: new ObjectId(user.id) });
        delete result.password;
        done(null, result);
    });

    return passport;
};