var express = require("express");
var router  = express.Router();
var Camp = require("../models/campground");
var Comment = require("../models/comments");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");

router.use(bodyParser.urlencoded({extended:true}));

router.use(methodOverride("_method"));


router.post("/product/:cid/comments/:commentid/reply",isLoggedIn,function(req, res) {
    Comment.findById(req.params.commentid,function(err, comment) {
        var data = req.body.comments;
        Comment.create(data,function(err,newcomment) {
            if(!err && comment)
            {
                 if(req.body.comments.text !== ""){
                     newcomment.pid = comment._id;
                newcomment.author.id = req.user._id;
                newcomment.author.username = req.user.profileName;
                newcomment.save();
                comment.comments.push(newcomment);
                comment.size+=1;
                comment.save();
                
                
                req.flash("success","Comment added successfully");
                 res.redirect("/product/comment/"+req.params.cid+"/viewreplies/"+comment._id);
                }
            }else
            {
                res.redirect("/campgrounds");
            }
        })
       
    })
  
});

router.get("/product/comment/:cid/viewreplies/:commentid",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.cid,function(err, camp) {
      
      if(!err)
      {
          Comment.findById(req.params.commentid).populate("comments").exec(function(err,comment){
       if(!err)
       {
           res.render("comments/view.ejs",{camp:camp,comments:comment,nanu:req.user});
        
       }
   });
      }
       
   });
   
    
});

router.post("/product/comment/:cid/reply/:commentid",isLoggedIn,function(req,res){
    
   Camp.findById(req.params.cid,function(err,camp)
   {
       if(err)
       {
           res.redirect("/campgrounds");
           
       }
       else
       {
           Comment.findById(req.params.commentid,function(err, comment) {
            res.render("comments/reply.ejs",{camp:camp,comment:comment});    
           });
           
       }
       
   });
    
})

router.post("/campgrounds/:id/comments",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err,camp)
    {
        if(err)
        {
            res.redirect("/campgrounds");
        }
        else
        {
            var data = req.body.comments;
        
            Comment.create(data,function(err,comment)
            {
                if(err)
                {
                    req.flash("error","Sorry, something went wrong!!!");
                    req.redirect("/campgrounds");
                }
                else
                {
                    if(req.body.comments.text !== ""){
                comment.author.id = req.user._id;
                
                comment.author.username = req.user.profileName;
                comment.save();
                camp.comments.push(comment);
                camp.save();
                req.flash("success","Comment added successfully");
                res.redirect("back");
                }
                else
                {
                  req.flash("error","Comment can't be empty");    
                  res.redirect("/campgrounds/"+req.params.id);   
                }
                }
            });
        }
    });
});
                
          


router.get("/campgrounds/:id/comments/new",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err,camp)
   {
       if(err)
       {
           res.redirect("/campgrounds");
           
       }
       else
       {
            res.render("comments/new.ejs",{camp:camp});
       }
       
   });
  
    
});

router.get("/campgrounds/:id/comments/:comment_id/edit",belongsToMe,function(req,res)
{
    var camp_id = req.params.id;
    var comment_id = req.params.comment_id;
               Comment.findById(comment_id,function(err, comment) {
                if(err)
                {
                    res.redirect("back");
                }
                else
                {
                      res.render("comments/edit.ejs",{camp_id:camp_id,comment:comment});
                }
                
        
    });
  
    
});

router.put("/campgrounds/:id/comments/:comment_id",belongsToMe,function(req,res)
{
    
    var camp_id = req.params.id;
    var comment_id = req.params.comment_id;
    
            var data = req.body.comments;
            Comment.findByIdAndUpdate(comment_id,data,function(err, comment) {
                if(err)
                {
                    res.redirect("back");
                }
                else
                {
                      res.redirect("/campgrounds/"+camp_id);
                }
          
    });
  
});

router.delete("/campgrounds/:id/comments/:comment_id",belongsToMe,function(req,res)
{
   Camp.findById(req.params.id,function(err, camp) {
          if(err)
          {
               req.flash("error","Sorry something went wrong");    
                  res.redirect("/campgrounds");   
              
          }else
          {
              
   Comment.findByIdAndRemove(req.params.comment_id,function(err,comment)
   {
       if(err)
       {
           res.redirect("back");
       }
       else
       {
        
           if(comment.pid)
           {
               Comment.findById(comment.pid,function(err,pcomment)
           {
              
              if(pcomment.comments){
                 pcomment.comments.remove(comment._id);
               pcomment.save();
               
              }else
              {
                  req.flash("success","comment removed successfully");
                  res.redirect("back");
                  
              }
             
           });
             Comment.findById(comment.pid,function(err,pcomment)
           {
               if(pcomment.pid){
                   
             
                  res.redirect("/product/comment/"+req.params.id+"/viewreplies/"+pcomment.pid);
               }
               else
               {
                  
                     res.redirect("/campgrounds/"+req.params.id);
                   
                   
               }
              
              
           });
         
           
           }
           else
           {
                req.flash("success","comment removed successfully");
                  res.redirect("/campgrounds/"+req.params.id);
           }
         
          
          
            
           
       }
       
   });
              
          }
                      
        })
    
});

function belongsToMe(req,res,next)
{
    if(req.isAuthenticated() || req.user.isAdmin)
    {
        Comment.findById(req.params.comment_id,function(err, comment) {
            if(err)
            {
                res.redirect("back");
            }
            else
            {
               
                if(comment.author.id.equals(req.user._id) || req.user.isAdmin)
                {
                    next();
                }
                else
                {
                    req.flash("error","Sorry you are not permitted to do that!!!");
                    res.redirect("/campgrounds/"+req.params.id);
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




function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated())
    {
        return next();
    }
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
    
}

module.exports = router;