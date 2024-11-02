var express = require('express');
var adminHelpers = require("../helpers/admin-helpers")
var router = express.Router();
var fs = require('fs');
const userHelpers = require('../helpers/user-helpers');
const upload = require('../helpers/multer');
var cloudinary = require('../helpers/cloudinary')


const verifyALogin = (req, res, next) => {
    //console.log("CHecking Loged in or not")
    if (req.session.user) {
        if(req.session.user.isAdmin){
            next()
        }else{
            res.status(403).send('<h1 style="font-family:sans-serif">Forbidden: Admins only</h1>');
        }
    } else {
       res.redirect('/login')
    }
};


/* GET users listing. */
router.get('/', verifyALogin, function(req, res, next) {
  adminHelpers.getAllProducts().then((products)=>{
      let user = req.session.user
    //console.log(products)
    res.render('admin/view-products', { products, user})
  })
  


});
router.get('/add-products',verifyALogin,function(req,res){
    let user = req.session.user
    res.render('admin/add-products', {  user })
})

//files are uploaded  here
router.post('/add-products', upload.single('image'),async (req,res)=>{
    console.log(req.body)
    console.log(req.file)
    
    
    console.log("printing");
    let image = req.file
    let exten = image.originalname.split('.').pop().toLowerCase();


    if (image.size < 5300000 && (exten === "jpg" || exten === "png" || exten === "jpeg")) {
        try {
            imageName = image.originalname
            const resultOfUpload = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (err, result) => {
                if (err) {
                    console.log(err);
                    console.log("Cloundinary error ",err.message);
                    
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    })
                }
                //console.log("Image uploaded Succesfully",result);
                req.body['secureUrl'] = result.secure_url
                req.body['publicId'] = result.public_id
                req.body['uploadDate'] = result.created_at
                console.log(req.body);
                //return res.send(`<code>Image uploaded Succesfully</code><br><h3>View them below</h3><br><a href="/images">View</a>`)

                adminHelpers.addProduct(req.body, (id) => {
                    console.log("callback");
                    let user = req.session.user
                    adminHelpers.getAllProducts().then((products) => {
                        console.log(products)
                        //res.render('admin/view-products', { products, user })
                    })
                })

            })
            resultOfUpload.end(image.buffer);
        } catch (e) {
            console.log("",e.message);
            res.json(e.message);
        }
    } else {
        console.log("file size problem");
        
        return res.send("<h1 style='color:red;font-family: sans-serif;'>File upload  was not a Success because file size exceeded or file type was not supported :(</h1>")
    }
    
    
})


router.get('/delete-products/:id', verifyALogin,function(req,res){
    let proId=req.params.id
    adminHelpers.deleteProduct(proId).then((response) => {
        fs.unlink(__dirname + "/../public/product-images/"+proId+".jpg", (err) => {
            if (err) {
                console.log('Err==>>',err);
                res.json({ status: false })
            } else {
                res.json({ status: true })
            }
        })
        //console.log(proId, " disp")
        
    })
    
    
})
router.get('/edit-products/:id', verifyALogin,async (req,res)=>{
    let user = req.session.user
    let product = await adminHelpers.getProductDetails(req.params.id)

    console.log("Checking null or not===>>>",product)
    res.render('admin/edit-products',{product,user})
})

router.post('/edit-products/:id',(req,res)=>{
    //console.log(req.body, req.params.id)
    adminHelpers.updateProduct(req.body,req.params.id).then(()=>{
        try {
            //console.log('Images======>>>>>',req.files);
            if(req.files.image){
                
                let id=req.params.id
                let image = req.files.image;
                image.mv("./public/product-images/" + id + ".jpg")
            }
        } catch (error) {
            console.log(error);
        }
        res.redirect('/admin')
    })

})



router.get('/users', verifyALogin,async(req,res)=>{
    let user = req.session.user
    let allUsers = await adminHelpers.getAllUsers();
    //console.log("Returned value==>>",allUsers)
    res.render('admin/user-option', { allUsers,user })
})


router.get('/all-orders' ,verifyALogin ,async (req,res)=>{
    let user = req.session.user;
    await adminHelpers.getAllUserOrders().then((response)=>{
        //console.log("++++",response);
        //console.log(response[0].products);
        
        res.render('admin/all-orders', {user, response})
    })
    
    
})


router.get("/user-order/:id",verifyALogin,async(req,res)=>{
    let user = req.session.user;
    let id = req.params.id
    let data = await adminHelpers.getOrderUser(id)
    res.render('admin/user-orders',{user,data})
})




module.exports = router;
