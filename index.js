const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    // res.send("Hello World!");
    res.render("index");
});

app.post("/register", async(req, res) => {
    let {username, password,name,email} = req.body;
    let user= await userModel.findOne({email: email});
    if(user) return res.status(500).send("User already exist");

    bcrypt.genSalt(10, (err, salt)=> {
        bcrypt.hash(password, salt, async (err, hash) => {
            console.log(hash );
            let createdUser = await userModel.create({
                username,
                name,
                email,
                password:hash //-----password
            });
            //res.send(createdUser);
            //console.log(createdUser);

            // let token = jwt.sign({email: email}, "abcd");
            // res.cookie("token", token);

            res.redirect("/login");
        });
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async(req, res) => {
    let {username, password} = req.body;
    let user= await userModel.findOne({username: username});
    if(!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (result) res.redirect("/profile");
        else res.send("You can't login");
    });

    let token = jwt.sign({username: username}, "abcd"); //------------------
    res.cookie("token", token);

});
 
app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

app.get("/profile", isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({username: req.user.username}).populate("posts");
    res.render("profile", {user});
});

app.post("/post",isLoggedIn, async (req, res) => {
    let user= await userModel.findOne({username: req.user.username});
    let post = await postModel.create({
        user: user._id,
        content: req.body.content,
    });    
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});

app.get("/like/:id", isLoggedIn, async(req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    post.likes.push(req.user.userid);
    await post.save();
    let user = await userModel.findOne({_id: post.user})
    res.redirect("/profile");
});

// function isLoggedIn(req, res, next) {
//     if (req.cookies.token === "") res.redirect("/login");
//     else {
//         let data = jwt.verify(req.cookies.token, "abcd");
//         req.user = data;
//     }
//     next();
// }

function isLoggedIn(req, res, next) {
    const token = req.cookies.token; //-----------------------

    // Check if the token is missing or empty
    if (token === "") {
        return res.redirect("/login");
    }

    try {
        // Verify the token
        let data = jwt.verify(token, "abcd");
        req.user = data;
        next(); // Only call next() if token is valid
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.redirect("/login"); // Redirect if token is invalid
    }
}


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});