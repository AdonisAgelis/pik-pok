var express = require("express"),
	app     = express(),
	bodyParser = require("body-parser"),
	mongoose = require("mongoose"),
	flash = require("connect-flash"),
	passport = require("passport"),
	LocalStrategy = require("passport-local"),
	methodOverride = require("method-override"),
	Image = require("./models/image"),
	Comment = require("./models/comment"),
	User = require("./models/user");

var port = process.env.PORT || 3000;

// Requiring Routes

var imageRoutes = require("./routes/images");
var commentRoutes = require("./routes/comments");
var indexRoutes = require("./routes/index");

mongoose.connect(process.env.DATABASEURL, { 
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true
}).then(() => {
	console.log("Connected to PikPok DB!");
}).catch(err => {
	console.log("Error:", err.message);
});

mongoose.set("useFindAndModify", false);
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

// Passport Configuration

app.use(require("express-session")({
	secret: "Adonis",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRoutes);
app.use("/images", imageRoutes);
app.use("/images/:id/comments", commentRoutes);

app.listen(port, function(){
	console.log("Server is up...");
});