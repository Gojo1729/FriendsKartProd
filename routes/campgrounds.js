require('dotenv').config();
var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var multer = require('multer');
var User = require("../models/user");
var nodemailer = require("nodemailer");
var compression = require('compression');
var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
var fs = require('fs');
var md5 = require("md5")
var bcrypt = require("bcrypt");
const saltRounds = 10;
var natural = require("natural")
var Review = require("../models/review")
var path = require("path");
const visualRecognition = new VisualRecognitionV3({
	
	url: process.env.url,
	version: '2018-03-19',
	iam_apikey: process.env.visionapikey,
	
    
});

var categories = [];
global.interestedCategory;
router.use(compression());

var stats={
    productsInSale:0,
    productsSold:0
};

var storage = multer.diskStorage({
    
  filename: function(req, file, callback) {
  
     
      
    callback(null, Date.now() + file.originalname);
     
  }
   
});
var imageFilter = function (req, file, cb) {
    
 
  // upload file to S3

    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, imageFilter:imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'shivucloud', 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret
});

router.get("/upload",isLoggedIn,function(req,res)
{
    Camp.find({},function(err,camps)
    {
        if(err)
        {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            res.render("campgrounds/upload.ejs");
        }
        
    });
  
});


router.get("/test",function(req, res) {
//     var tokenizer = new natural.WordTokenizer();
// console.log(tokenizer.tokenize("your dog has fleas."));
var base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
var rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
var lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";
var defaultCategory = 'N';
 
var lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
var rules = new natural.RuleSet(rulesFilename);
var tagger = new natural.BrillPOSTagger(lexicon, rules);
 var sentence = ["search","for","elon","musk","book"];
console.log(tagger.tag(sentence));
})
router.get("/campgrounds",function(req,res)
{
    if(req.query.search)
    {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    
        // Camp.find({$text:{$search:regex}},{score:{$meta:"textScore"}},function(err,prods)
        // {
          
        //   res.send(prods);
            
        // }).sort({score:{$meta:"textScore"}});
    
          Camp.find({$or:[{"category":regex},{"name":regex}]},function(err,camps)
    {
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            if(camps.length < 1)
            {
                req.flash("error","Your search "+req.query.search+" didn't match any of our products");
                 res.redirect("back");
                
            }else{
            res.render("campgrounds/search.ejs",{camps:camps,key:req.query.search});
            }
        }
        
    }).sort({"_id":-1});
  
        
    }else{
          Camp.find({},function(err,camps)
    {
        if(err)
        {
             req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            
                if(req.user && req.user.interested.length >= 1 ){
                 
                    interestedCategory = [];
                  
                   if(req.user.interested.length >=2){
                    interestedCategory[0]=req.user.interested[req.user.interested.length-1].category;
                   interestedCategory[1]=req.user.interested[req.user.interested.length-2].category;   
                   }
                   else if(req.user.interested.length ==1 )
                   { 
                       interestedCategory[0]=req.user.interested[req.user.interested.length-1].category;
                       interestedCategory[1]=req.user.interested[req.user.interested.length-1].category;
                   }
                     console.log("cat"+interestedCategory); 
                   Camp.find({"category":{$in:[interestedCategory[0],interestedCategory[1]]},"author.id":{$ne:req.user._id}},function(err, products) {
                      if(!err)
                      {
                         res.render("campgrounds/index.ejs",{camps:camps,products:products});
                      }
                       
                   }).limit(6);
                 
                }else
                {
                    res.render("campgrounds/index.ejs",{camps:camps,products:null});
                }
                
                            
        }
        
    }).sort({"_id":-1});
  
    }
    
  
});
router.post("/reason/:id",isLoggedIn,function(req,res){
    Camp.findById(req.params.id,function(err,product)
    {
        if(err)
        {
             req.flash("error","Sorry!!!,something went wrong.");
             return res.redirect("/campgrounds");
        }else
        {
            if((product.requestedBy == req.user._id.toString()) || (product.author.id == req.user._id.toString()))
            {
                 res.render("reason.ejs",{pid:req.params.id,product:product}); 
            }else
            {
                 req.flash("error","Sorry!!!,you are not allowed here");
                 return res.redirect("/campgrounds");
            }
        }
        
    });
  
});




router.get("/refreshindex",isLoggedIn,function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
           res.redirect("/campgrounds");
       }
       else
       {
           
           req.flash("error","Sorry, product request was cancelled by the user");
           res.render("campgrounds/heart2.ejs",{camps:camps});
       }
    });
    
});




router.get("/getproducts",function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
           res.redirect("/campgrounds");
       }
       else
       {
           res.render("campgrounds/heart.ejs",{camps:camps});
       }
    }).sort({"_id":-1});
    
});


router.post("/campgrounds",isLoggedIn,upload.single("image"),async (req,res) =>
{

var images_file= fs.createReadStream(req.file.path);
var classifier_ids = 	["next_1532709651"];

var threshold = 0.9;

var params = {
	images_file: images_file,
	classifier_ids: classifier_ids,
	threshold: threshold
};

await visualRecognition.classify(params, function(err, response) {
	if (err)
    {
        req.flash("error","Sorry something went wrong");
      
        res.redirect("back");
    }
	else{
//	   res.send(JSON.stringify(response, null, 2));
	  if(response.images[0].classifiers[0].classes.length == 0)
	  {
	      
	    
	         
	   cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
       
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            return res.redirect("back");
        }
        
    req.body.camp.image = result.secure_url;
    req.body.camp.imageId = result.public_id;
    req.body.camp.sale=true;
    req.body.camp.category = "Miscallenous";
    req.body.camp.name = req.body.camp.campSiteName;
    req.body.camp.author={
        id:req.user._id,
        username:req.user.username
    };
   
await   Camp.create(req.body.camp,function(err,camp)
    { 
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            return res.redirect("back");
        }
         
         res.redirect("/campgrounds");
        
    });
    
    });
    
 
	      
	      
	  }else
	  {
	        var max = response.images[0].classifiers[0].classes[0].score;
	    var category;
	    for(var i=0;i<response.images[0].classifiers[0].classes.length ; i++)
	{
	    if(max<= response.images[0].classifiers[0].classes[i].score)
	    {
	        max =  response.images[0].classifiers[0].classes[i].score;
	        category =  response.images[0].classifiers[0].classes[i].class;
	    }
	}
	if(category!="negative")
	{

	         
	   cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            return res.redirect("back");
        }
        
    req.body.camp.image = result.secure_url;
    req.body.camp.imageId = result.public_id;
    req.body.camp.sale=true;
    req.body.camp.category = category;
    req.body.camp.name = req.body.camp.campSiteName;
    req.body.camp.author={
        id:req.user._id,
        username:req.user.username
    };
   
await   Camp.create(req.body.camp,function(err,camp)
    { 
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            return res.redirect("back");
        }
         if(categories.indexOf(category) == -1){
             categories.push(category);
            
         }
         res.redirect("/campgrounds");
        
    });
    
    });
    
 
	        

	}
	else
	{
	    req.flash("error","Sorry category of the product seems to be explicit");
       
        res.redirect("back");
	    
	}
	


	
	  
	      
	  }
	    
	    
	    	
	}

});
 

    
});




   

router.get("/campgrounds/new",isLoggedIn,function(req, res) {
    res.render("campgrounds/new.ejs");
});

router.get("/campgrounds/:id",isLoggedIn,function(req,res)
{
    var campId = req.params.id;
    
    Camp.findById(campId).populate("comments").exec(function(err,camp)
    {
        if(err)
        {
           req.flash("error","Product not found");
           res.redirect("/campgrounds");
        }
        else
        {
            if(req.user){
              if ((!camp || !camp.sale) && !req.user.isAdmin) {
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  return res.redirect("/campgrounds");
            }
            }
            if(camp){
               
               Camp.findOne({"favourite":{$elemMatch:{"_id":req.user._id}},"_id":req.params.id},function(err,user){
                   if(err){
                       req.flash("error","Sorry, something went wrong");
                       res.redirect("back");
                   }
                   else
                   {
                       var j=0;
                       if(req.user.interested.length == 0)
                       {
                           var data = {"category":camp.category,"count":1};
                                      req.user.interested.push(data);
                                      req.user.save();
                                      console.log("illa"+req.user.interested);
                       }else{
                           for(var i=0;i<req.user.interested.length;i++)
                           {
                               if(req.user.interested[i].category != camp.category)
                               {
                                   j=1;
                               }
                               else
                               {
                                   j=0;
                                   req.user.interested[i].count+=1;
                                   req.user.save();
                                   console.log("ide"+req.user.interested);
                                   break;
                                     
                               }
                           }
                           if(j==1)
                              {
                                 
                                      
                                      data = {"category":camp.category,"count":1};
                                      req.user.interested.push(data);
                                      req.user.save();
                                      console.log("illa"+req.user.interested);
                              }
                       
                       
                       }
                       req.user.interested.sort({"category":1});
                       if(req.user.viewed.indexOf(camp._id) == -1)
                           {
                               req.user.viewed.push(camp._id);
                             
                           }
                       if(user)
                       {
                         
                            res.render("campgrounds/show.ejs",{camp:camp,nanu:req.user,fav:true});
                    
                       }
                       else
                       {
                            
                             res.render("campgrounds/show.ejs",{camp:camp,nanu:req.user,fav:false});
                          
                       }
                   }
               });
             
            
            }
            else{
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  res.redirect("/campgrounds");
            }
        }
        
    });
  
});

router.get("/products/categories",isLoggedIn,function(req,res){
  
     const havingCategory = ["books","bottles","watch","bags","rubiks cube","headphones","Miscallenous"];
   
     res.render("campgrounds/categories.ejs",{havingCategory:havingCategory});
   
    
   
});



router.get("/campgrounds/:id/edit",myCampground,function(req, res) {
    
    if(req.isAuthenticated)
    {
        
        Camp.findById(req.params.id,function(err,camp)
   {
       
       if(err)
       {
           res.redirect("/campgrounds");
       }
       else
       {
         
           if(camp.sale){
            res.render("campgrounds/edit.ejs",{camp:camp});
           }else
           {
               req.flash("error","Sorry product not available to edit");
               res.redirect("/campgrounds");
           }
           
       }
   });
    }
    else{
        
         req.flash("error","Please log in");
               res.redirect("back")
        
    }
   
   
   
  
    
});

function myCampground(req,res,next)
{
   
    if(req.isAuthenticated())
    {
        Camp.findById(req.params.id,function(err, camp) {
            if(err)
            {
                req.flash("error","Product not found");
                res.redirect("/campgrounds");
            }
            else
            {
                if(!camp)
                {
                     req.flash("error", "Item not found.");
                     return res.redirect("/campgrounds");
                }
                if(camp.author.id.equals(req.user._id))
                {
                    next();
                }
                else
                {
                    req.flash("error","You are not permitted to do that!!!");
                    res.redirect("/campgrounds/"+req.params);
                }
            }
        });
    }
    else
    {
         req.flash("error","LogIn and be part of our community!!!");
        res.redirect("back");
    }
}



router.put("/campgrounds/:id",isLoggedIn,upload.single("image"), function(req,res){
    var category ;
    Camp.findById(req.params.id, async function(err,camp){
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            res.redirect("/campgrounds/"+req.params.id+"/edit");
        }
        else
        {
            if(req.file){
             
               
               var images_file= fs.createReadStream(req.file.path);
                var classifier_ids = ["producttagging_1727079250"];

var threshold = 0;

var params = {
	images_file: images_file,
	classifier_ids: classifier_ids,
	threshold: threshold
};

await visualRecognition.classify(params, async function(err, response) {
	if (err)
    {
        req.flash("error","Sorry something went wrong");
       
        res.redirect("back");
    }
	else{
	
	    var max = response.images[0].classifiers[0].classes[0].score;
	  
	    for(var i=0;i<response.images[0].classifiers[0].classes.length ; i++)
	{
	    if(max<= response.images[0].classifiers[0].classes[i].score)
	    {
	        max =  response.images[0].classifiers[0].classes[i].score;
	        category =  response.images[0].classifiers[0].classes[i].class;
	    }
	}   
	           
	
	           if( category != "negative")
                {
                           try{
                    await  cloudinary.v2.uploader.destroy(camp.imageId);
                     var result = await cloudinary.v2.uploader.upload(req.file.path,{crop: "scale", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" });
                     camp.imageId=result.public_id;
                   
                     camp.image=result.secure_url;
             
                }
                catch(err){
                    
                     req.flash("error","Sorry!!!something went wrong");
                     return res.redirect("back");
                    
                }
         
         
          camp.name = req.body.camp.campSiteName;
          camp.category = category;
          camp.description = req.body.camp.description;
          camp.price=req.body.camp.price;
          camp.save();
          req.flash("success","Successfully updated!!!");
          res.redirect("/campgrounds/"+camp._id);
        }
                    
                else
                {
                 req.flash("error","The image you are trying to upload seems to be explicit.Please try to upload new one!!!");
                 res.redirect("back");   
                }
         
	    
	}
	
});

}else
        {
          camp.name = req.body.camp.campSiteName;
          camp.category = category;
          camp.description = req.body.camp.description;
          camp.price=req.body.camp.price;
          camp.save();
          req.flash("success","Successfully updated!!!");
          res.redirect("/campgrounds/"+camp._id); 
        }
}
});
});


router.get("/campgrounds/buy/:id",isLoggedIn,function(req, res) {
   if(req.user.verified){
        Camp.findById(req.params.id,function(err,camp)
   {
       if(camp){
           if(err || !camp.sale)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
           
       }
       else
       {
           camp.sale=false;
           camp.sold = false;
           camp.requestedBy = req.user._id;
           User.findById(camp.author.id,function(err, user) {
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error","Sorry!!!something went wrong");
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Your product '+camp.name+" is requested by "+ buyer.profileName ,
        text: 'You are receiving this because someone  have requested your product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart.mybluemix.net/campgrounds/user/"+camp.author.id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to seller");
              return res.redirect("/campgrounds");
          }
      
       
       
      });
                    
                })
      
         
               
           });
           camp.save();
             req.flash('success', 'Your request is being processed and and e-mail has been sent to seller . Processing may take few minutes ');
           res.redirect("/mykart")
       }
       }
       else
       {
           req.flash("error","Product not available");
           return res.redirect("/campgrounds");
       }
       
       
   });
   
   }else
   {                                                                        
       req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email. <a href='{url('/resend')}'> click here </a>");
        
       return  res.redirect("back");
   }
  
    
});
router.get("/mykart/refresh",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
            res.render("campgrounds/mykart2.ejs",{camps:camps});
                
       }
   })
  
    
});
router.get("/mykart",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
            res.render("campgrounds/mykart.ejs",{camps:camps});
                
       }
   })
  
    
});



router.get("/master/users",isLoggedIn,Admin,function(req, res) {
    if(req.user.isAdmin){
   User.find({},function(err, users) {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
       }
       else{
      res.render("campgrounds/users.ejs",{users:users}); 
       }
   });
    }
    else
    {
        req.flash("error","Sorry you don't have permission for entering this page");
        return res.redirect("/campgrounds");
    }
});

router.get("/campgrounds/buyer/:id",isLoggedIn,function(req, res) {
   var stars=0;
   Camp.findById(req.params.id,function(err,camp)
   {
       if(err)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
       }
       else
       {
           
           if( !camp.sale || req.user.isAdmin){
            
               camp.save();
           User.findById(camp.author.id,function(err, seller) {
               if(err)
               {
                   req.flash("error","Sorry!!!something went wrong");
                   res.redirect("/campgrounds");
               }
               else
               {
                   if(camp.requestedBy)
                   {
                       User.findById(camp.requestedBy,function(err, buyer) {
                       if(!err && buyer){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                  
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               
               
                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                  
                    
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
              
             
                      bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                    // res == true
                    Review.find({"owner":camp.author.id.toString()},function(err, reviews) {
                        if(reviews)
                        {
                            reviews.forEach(function(review){
                               stars+=review.stars;
                            });
                           
                             res.render("campgrounds/seller.ejs",{buyer_usn:hash_buyer,camp:camp,buyer:buyer,seller:seller,stars:stars/reviews.length});    
                        }
                   
                     
                    });
                    
                    
                      
                    });
                
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       
                       }    
                       
                    
                   });
                       
                   }else
                   {
                         res.render("campgrounds/seller.ejs",{buyer_usn:"",camp:camp,buyer:"",seller:seller});
                   }
                   
                
               }
           });
           
           }else
           {
               req.flash("error","Product cannot be found or was cancelled");
               return res.redirect("back");
           }
           
       }
       
   });
   
    
});
router.get("/review/:pid",function(req,res)
{
    Camp.findOne({"_id":req.params.pid,"requestedBy":req.user._id},function(err, product) {
        if(product){
         res.render("campgrounds/review.ejs",{id:req.params.pid,product:product});   
       
        }
        
    })
    
});
router.get("/campgrounds/sell/refresh/:id",isLoggedIn,function(req, res) {
    var Buyer = new User();
    Camp.findById(req.params.id,function(err, camp) {
       
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(camp &&!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               Buyer = buyer;
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
              else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               

                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                  
                   
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
             
               
                    bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                    
                   
                     res.render("campgrounds/buyer_refresh.ejs",{seller_usn:hash_seller,buyer_usn:hash_buyer,camp:camp,buyer:buyer,seller:seller});
                    
                      
                    });
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       }
                         
                   });
                
               }
           });
          }else
          {
              req.flash("error","Sorry, the order for the product "+camp.name+" was cancelled");
              return res.redirect("/campgrounds/user/"+req.user.id);
          }
           
      }
   });
  
   
    
});

router.get("/campgrounds/sell/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               
               
                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                   
                  
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
              
              
                    bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                   
                  
                     res.render("campgrounds/buyer.ejs",{seller_usn:hash_seller,camp:camp,buyer:buyer,seller:seller});
                    
                      
                    });
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       }
                         
                   });
                
               }
           });
          }else
          {
             
              return res.redirect("/campgrounds");
          }
           
      }
   });
  
   
   
    
});

router.post("/revoke/:id",isLoggedIn,function(req,res)
{
     
    Camp.findById(req.params.id,function(err, camp) {
      if(err)
      {
          req.flash("error","Sorry your request couldn't be processed");
      }
      else
      {
       if(camp)
       {
          camp.sale=true;
          camp.sold=false;
          camp.agree = false;
          User.findById(camp.requestedBy,function(err, buyer) {
                  User.findById(camp.author.id,function(err, seller) {
                          if(err)
              {
                  req.flash("error",err.message);
                  return res.redirect("/campgrounds");
              }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:seller.email,
        from: 'friendskarttech@gmail.com',
        subject:seller.profileName+" ,order for your product "+camp.name+" was cancelled",
        text: 'You are receiving this because the order for the product '+camp.name+' was cancelled by '+buyer.profileName+'\n\n' +
          'Reason for cancellation: '+req.body.reason+'\n\n'+
         'So, your product is back on sale, check out your profile for more info\n\n'+
         "https://friendskart.mybluemix.net/campgrounds/user/"+seller._id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
       
       
       
       
      });
                    
                })
                   
                    
                });
        
          camp.requestedBy = "";
          camp.save();
            req.flash("success","We have notified the seller that you have cancelled the order to buy the product");
            return res.redirect("/campgrounds");
       
       }else
       {
            req.flash("error","Sorry!!!,something went wrong.");
            return res.redirect("/campgrounds");
           
       }
      }
    });
    
});


router.get("/master/stats",isLoggedIn,Admin,function(req, res) {
   
   
   Camp.count({$or:[
    {money:true},
    {recieved:true}
  ] },function(err, count) {
       
       stats.productsSold=count;
      

   });
   Camp.count({"sale":true},function(err, count) {
       
       stats.productsInSale=count;
      

   });
    Camp.count(function(err,count){
      if(!err){
          User.count(function(err,users)
          {
              if(!err)
                res.render("campgrounds/stats.ejs",{count:count,users:users,stats:stats});
          });
      }
    });
});
     
function Admin(req,res,next)
{
    if(req.isAuthenticated())
    {
        if(req.user.isAdmin)
        {
          return  next();
        }
        else
        {
            req.flash("error","Sorry you are not permitted");
            return res.redirect("/campgrounds");
        }
    }
}
router.delete("/campgrounds/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,async function(err,camp)
   {
      if(err)
      {
          req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
      }
      else
      {
          try
          {
             
              if(!camp.sale)
              {
                  req.flash("error","The product is currently being requested,so you can't delete the product");
                  if(camp.author.id == req.user._id){
                  return res.redirect("/campgrounds/user/"+camp.author.id);
                  }
                  else
                  {
                          return res.redirect("back");
                  }
              }
            
              await cloudinary.v2.uploader.destroy(camp.imageId);
          
              camp.remove();
              req.flash("success","Product "+camp.name+" removed");
              res.redirect("/campgrounds");
            
          }
          catch(err)
          {
              req.flash("error","Sorry!!!something went wrong");
              return res.redirect("back");
                
          }
          
          
      }
   });
    
});


router.get("/campgrounds/user/:id",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
            
       }
       else
       {
           Camp.count({"sale":true,"author.id":req.params.id},function(err, count) {
               if(err)
               {
                    req.flash("error","Sorry something went wrong");
                    res.redirect("back");
               }
               else
               {
                    res.render("campgrounds/products.ejs",{camps:camps,count:count});
               }
           })
          
       }
       
   }).sort({sale:1});
   
    
});
router.get("/campgrounds/user/:id/refresh",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
          req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
           res.render("campgrounds/products_refresh.ejs",{camps:camps});
       }
       
   });
   
    
});

router.get("/agree/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      if(!camp.sale){
           if(err)
      {
           req.flash("error","Sorry!!!something went wrong");
           return res.redirect("back");
      }
      camp.sold=true;
      camp.agree = true;
      camp.save();
          User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error","Sorry!!!something went wrong");
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to sell. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to sell the product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart.mybluemix.net/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
      
       
       
      });
                    
                })
      
         
        req.flash("success","We have sent notified the buyer that you have accepted to sell, ");
           
        return  res.redirect("back");
      
      }else
      {
           req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
          
      }
     
      
       
   });
    
});

router.get("/product/accept/:id",isLoggedIn,function(req, res) {
   Camp.findById(req.params.id,function(err, camp) {
       if(!camp.sale){
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
           return res.redirect("back");
       }
       camp.sold=true;
       camp.save();
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error","Sorry!!!something went wrong");
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to chat with you. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to chat with you.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart.mybluemix.net/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
     
       
      });
                    
                })
      
         
               req.flash("success","We have  notified the buyer that you have accepted his request,check out chat option below");
           
        return  res.redirect("back");
       }
       req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
       
       
   })
   
    
});
router.post("/cancel_request/:id",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error","Sorry,Product not available");
           return res.redirect("/campgrounds");
       }
       
       camp.sale=true;
       camp.sold=false;
       camp.agree = false;
       camp.save();
       res.redirect("/campgrounds/user/"+req.user._id);
       
    });
    
    
    
});
router.get("/terms",function(req, res) {
    res.render("campgrounds/terms.ejs");
})
router.get("/product/decline/:id",isLoggedIn,function(req, res) {
 
     req.flash("success","We have notified the buyer that you have cancelled his order");
  Camp.findById(req.params.id,function(err, camp) {
      if(err)
      {
           req.flash("error","Sorry,Product not available");
           return res.redirect("back");
      }
      if(camp)
      {
          camp.sold=false;
      camp.sale=true;
      camp.agree = false;
          User.findById(camp.requestedBy,function(err, buyer) {
                  User.findById(camp.author.id,function(err, seller) {
                          if(err)
              {
                  req.flash("error",err.message);
                  return res.redirect("/campgrounds");
              }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:buyer.email,
        from: 'friendskarttech@gmail.com',
        subject:buyer.profileName+" ,the product "+camp.name+" which you have ordered was cancelled by the seller "+seller.profileName,
        text: 'You are receiving this because your order for the product '+camp.name+' was cancelled by '+seller.profileName+'\n\n' +
        'reason for cancellation :'+req.query.reason +'\n'+
          "click the below link to go to your cart \n\n"+
         "https://friendskart.mybluemix.net/campgrounds/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
       
       
      });
                    
                })
                   
                    
                });
        
       
      camp.requestedBy = "";
      camp.save();
      res.redirect("/campgrounds");
           
      }
       
  });
    
});


router.get("/money/:id",isLoggedIn,function(req, res) 
   {
   Camp.findById(req.params.id,function(err, camp) {
      
      camp.money=true;
      camp.save();
      res.redirect("/campgrounds/user/"+camp.author.id);
      
       
   });
   
});


router.get("/recieved/:pid",function(req, res) {
    Camp.findById(req.params.pid,function(err, product) {
        if(product && !err){
              User.findById(product.author.id,function(err, user) {
                  if(user && !err)
                  {
                        
                  
                    var data = {"stars":req.query.stars,"review":req.query.review,"owner":user._id,"buyer":req.user._id,"product":product};
                    
                    Review.create(data,function(err, review) {
                      
                       user.review.push(review);
                       
                       
                         user.save();
                    });
                    
                      product.recieved=true;
                      product.save();
                      res.redirect("/mykart");
                  }
              })
        }else
        {
             req.flash("error","Sorry,something went wrong");
             return res.redirect("/campgrounds");
        }
     
        
    })
  
       

    
});


router.delete("/user/:id",isLoggedIn,function(req, res) {
  
   User.findByIdAndRemove(req.params.id,function(err, user) {
       
      
            if(err)
            {
                res.redirect("back");
            }
            Camp.find({"requestedBy":user._id},function(err, camps) {
               
               if(!err)
               {
                   camps.forEach(function(camp)
                   {
                       if(!camp.sale)
                       {
                           
                           camp.sale=true;
                           camp.sold=false;
                           camp.agree=false;
                           camp.save();
                           
                       }
                       
                   });
               }
                
            });
             Camp.remove({"author.id":user._id},function(err, camps) {
                 if(!err){
             req.flash("success","Account with username "+user.username+" removed successfully");
             res.redirect("back");
                 }
           
    });
    
         
       
       });

                  
     
});

router.get("/contact",isLoggedIn,function(req,res)
{
    res.render("campgrounds/email.ejs");
});

router.get("*",function(req, res) {
     
   res.render("category/notfound.ejs")
});



function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};





function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated() )
    {
        if(req.user.verified)
        {
            return next();
        }
        else
        {
           
            req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email <a href=/resend> "+"click here");
            res.redirect("/campgrounds"); 
            
            
        }
      
    }
    else{
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
    
    }
}

module.exports = router;