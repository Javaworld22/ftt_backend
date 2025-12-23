secureRoute = (req, res, next) => {
    // console.log(req.headers["autorization"])
    const header = req.headers["autorization"]
    if(typeof header !== 'undefined'){
     req.token = header
      next()
    }else{
        res.status(403).json({
            success: false,
            msg: "Not Authorized",
            data: ""
        });
    }

}

module.exports = {secureRoute}