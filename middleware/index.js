var middlewareObject = {};

var Comment = require("./models/comments");

middlewareObject.belongsToMe = function(req,res,next){
    if(req.isAuthenticated())
    {
        Comment.findById(req.params.comment_id,function(err, comment) {
            if(err)
            {
                res.redirect("back");
            }
            else
            {
                if(comment.author.id.equals(req.user._id))
                {
                    next();
                }
                else
                {
                    res.redirect("back");
                }
            }
        });
    }
    else
    {
        res.redirect("/campgrounds");
    }
}