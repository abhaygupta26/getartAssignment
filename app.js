const express = require("express");
const fs = require('fs');
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,"Images")
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(session({
    secret:"Our secret key",
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://admin-abhay:admin123@cluster0.x7zat.mongodb.net/assignmentDb', {useNewUrlParser: true, useUnifiedTopology: true});
// mongoose.set('useCreateIndex', true);

const productSchema = mongoose.Schema({
    
    title: String,
    description: String,
    size_type: String,
    image:{
        data: Buffer,
        contentType:String
    },
    price: String,
    quantity: String,
    color:String,
    material: String,
    seo_title:String,
    seo_description: String

});

const Product = mongoose.model("Product", productSchema);

const userSchema =new mongoose.Schema( {
    email: String,
    password: String,
    product: productSchema
});
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});



//----------------------------------------------------ROUTES---------------------------------------------------------

app.get("/", function(req, res){
    res.render("product_description");
});

app.post("/", upload.single("image"), function (req,res) {

    var obj = {

        title : req.body.product_title,
        description : req.body.product_description,
        image: {
            data: fs.readFileSync(path.join(__dirname + '/Images/' + req.file.filename)),
            
        },
        size_type:req.body.size_cate,
        price:req.body.size_price,
        quantity:req.body.size_quantity,
        color:req.body.color_pick,
        material:req.body.product_material,
        seo_title: req.body.seo_title,
        seo_description: req.body.seo_description

    }

    console.log(req.body.color_pick);

    Product.create(obj, function (err, item) {
        if(err){
            console.log(err);
        }else{
            item.save(function (err) {
                if(!err){
                    console.log("Item is saved in the database");
                    res.redirect("/register");
                }
            });
        }
    })

    
});

app.get("/productsListing", function (req, res) {
    if(req.isAuthenticated()){
        Product.find({}, function (err, foundProducts) {
            if(err){
                console.log(err);
            }else{
                if(foundProducts){
                   
                    res.render("productsListing", {products: foundProducts});
                 
                        
                }
            }
        });
    } else{
        res.redirect("/login");
    }
});



app.get("/productsListing/:productId", function(req, res){
    const requestedId = req.params.productId;

    Product.find({}, function(err, foundProducts){
        if(err){
            console.log(err);
        } else {
            foundProducts.forEach(function(product){
                const storedId = product.id;
                if(requestedId === storedId){
                    res.render("product", {id: product.id ,title: product.title, description: product.description, image: product.image.data});
                }
            });
        }
    });
});

app.post("/productsListing/:productId", function(req, res){
   
    const requestedId = req.params.productId;
    const query = {id:req.user._id}

    Product.find({}, function (err, foundProduct) {
        if(err){
            console.log(err)
        }else{
            foundProduct.forEach(function(product){
                const storedId = product.id;
                if(requestedId === storedId){
                    User.findOneAndUpdate(query, {product: product },function (err, foundUser) {
                        if(err){
                            console.log(err);
                        }else{
                            if(foundUser){
                            console.log(foundUser);
                            console.log(product)
                            res.render("cart", {cartTitle: product.title, cartDescription: product.description, cartImg:product.image});
                            }
                        }
                    });
                }
            })
        }
    });

});

app.get("/register", function (req, res) {
    res.render("register");
});


app.post("/register", (req, res) => {
    
    User.register({username:req.body.username}, req.body.password, function (err, user) {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                console.log("register");
                res.redirect("/productsListing");
            });
        }
    });
});


app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", (req, res) => {

    const user = new User({
        username: req.body.username,
        password:req.body.password
    });
 
    req.login(user, function(err) {
     if (err) {
          console.log(err);
          res.redirect("/login");
     }else{
         passport.authenticate("local")(req, res, function(){
             res.redirect("/productsListing");
         });
     }
   });
 });


 app.get('/logout', function(req, res){
    req.logout();
    res.clearCookie();
    res.redirect('/register');
  });


app.listen(process.env.PORT || 3000, function(){
    console.log("Server is started on the Port 3000");
});