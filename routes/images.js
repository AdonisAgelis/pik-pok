var express = require("express");
var router = express.Router();
var Image = require("../models/image");
var middleware = require("../middleware");

require("dotenv").config();

var multer = require('multer');

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: "sweetscientist", 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Index Route

router.get("/", function(req, res){
	if (req.query.search){
		var regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Image.find({description: regex}, function(err, allImages){
			if (err){
				console.log(err);
			} else {
				if (allImages.length < 1){
					req.flash("error", "No posts match your search. Try again!");
					return res.redirect("back");
				}
				res.render("images/index", {images: allImages, page: "images"});
			}
		});
	} else {
		Image.find({}).sort({createdAt: -1}).exec(function(err, allImages) {
			if (err) {
				console.log(err);
			} else {
				res.render("images/index", {images: allImages, page: "images"});
			}
    	});
	}
});

// Create Route

router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
	cloudinary.uploader.upload(req.file.path, function(result) {
  		req.body.image.image = result.secure_url;
  		req.body.image.author = {
    		id: req.user._id,
    		username: req.user.username
 		}
  		Image.create(req.body.image, function(err, image) {
    		if (err) {
      			req.flash('error', err.message);
      			return res.redirect('back');
   			}
    		res.redirect('/images/' + image.id);
  		});
	});
});

// New Route

router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("images/new");
});

// Show Route

router.get("/:id", function(req, res){
	Image.findById(req.params.id).populate("comments likes").exec(function(err, foundImage){
		if (err || !foundImage){
			req.flash("error", "Image not found");
			res.redirect("back");
		} else {
			res.render("images/show", {image: foundImage});
		}
	});
});

// Like Route

router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Image.findById(req.params.id, function (err, foundImage) {
        if (err) {
            console.log(err);
            return res.redirect("/images");
        }

        var foundUserLike = foundImage.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            foundImage.likes.pull(req.user._id);
        } else {
            foundImage.likes.push(req.user);
        }

        foundImage.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/images");
            }
            return res.redirect("/images/" + foundImage._id);
        });
    });
});

// Edit Route

router.get("/:id/edit", middleware.checkImageOwnership, function(req, res){
	Image.findById(req.params.id, function(err, foundImage){
		res.render("images/edit", {image: foundImage});
	});
});

// Update Route

router.put("/:id", middleware.checkImageOwnership, function (req, res) {
    Image.findById(req.params.id, function (err, image) {
        if (err) {
            console.log(err);
            res.redirect("/images");
        } else {
            image.description = req.body.image.description;
            image.image = req.body.image.image;
            image.save(function (err) {
                if (err) {
                    console.log(err);
                    res.redirect("/images");
                } else {
                    res.redirect("/images/" + image._id);
                }
            });
        }
    });
});

// Destroy Route

router.delete("/:id", middleware.checkImageOwnership, function(req, res){
	Image.findByIdAndRemove(req.params.id, function(err){
		if (err){
			res.redirect("/images");
		} else {
			res.redirect("/images");
		}
	});
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;