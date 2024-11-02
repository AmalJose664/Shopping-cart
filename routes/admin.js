var express = require('express');
var adminHelpers = require("../helpers/admin-helpers")
var router = express.Router();
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
    if(image ){
        await adminHelpers.imageUpload(req, res,image)
    }else if(req.body.url){
        await adminHelpers.imageUpload(req, res, req.body.url)
    }
    else{
        res.json({message:"No image recieved"})
    }
 
})


router.get('/delete-products/:id', verifyALogin,async function(req,res){
    console.log("request reccieved");
    
    let proId=req.params.id
    adminHelpers.findProduct(req.params.id).then( async (product)=>{

        try {
            await adminHelpers.imageDelete(res, product.publicId) 
            
            adminHelpers.deleteProduct(proId).then((response) => {
                res.json({ message: "Failed to delete existing image", status: true })
                console.log(response);
                //console.log(proId, " disp")
            })
        } catch (error) {
            res.json(e.message)
        }
    })
    
    
    
})
router.get('/edit-products/:id', verifyALogin,async (req,res)=>{
    let user = req.session.user
    let product = await adminHelpers.getProductDetails(req.params.id)

    console.log("Checking null or not===>>>",product)
    res.render('admin/edit-products',{product,user})
})



router.post('/edit-products/:id', upload.single('image') ,async (req,res)=>{
    let image = req.file
    //console.log(req.body, req.params.id)
    adminHelpers.findProduct(req.params.id).then(async(product)=>{
        if(image){
            try {
                await adminHelpers.imageDelete(res, product.publicId)
                
                let exten = image.originalname.split('.').pop().toLowerCase();

                if (image.size >= 5300000 || !["jpg", "png", "jpeg"].includes(exten)) {
                    return res.send("<h1 style='color:red;font-family: sans-serif;'>File upload failed: file size exceeded or file type not supported</h1>");
                }

                try {
                    const resultOfUpload = await cloudinary.uploader.upload_stream({ resource_type: 'image' }, (err, result) => {
                        if (err) {
                            console.log(err);
                            console.log("Cloundinary error ", err.message);

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
                        adminHelpers.updateProduct(req.body, req.params.id,true).then(() => {
                            try {
                                //console.log('Images======>>>>>',req.files);
                                res.redirect('/admin');

                            } catch (error) {
                                console.log(error);
                            }
                        })
                    })
                    resultOfUpload.end(image.buffer);
                    console.log("finished function ");
                    res.redirect('/admin')
                    
                } catch (e) {
                    console.log("", e.message);
                    res.json(e.message);
                }


            } catch (error) {
                console.log("This result catch", error);
                res.json(error.m)
            }
        }else if (req.body.url !== ""){
            let url = req.body.url
            try {
                await adminHelpers.imageDelete(res, product.publicId)
                
                try {
                    const resultOfUpload = await cloudinary.uploader.upload(url, (err, result) => {
                        if (err) {
                            console.log(err);
                            console.log("Cloundinary error ", err.message);

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
                        adminHelpers.updateProduct(req.body, req.params.id, true).then(() => {
                            try {
                                //console.log('Images======>>>>>',req.files);
                                res.redirect('/admin');

                            } catch (error) {
                                console.log(error);
                            }
                        })
                    })
                    console.log("finished function image replace by link");

                } catch (e) {
                    console.log("", e.message);
                    res.json(e.message);
                }


            } catch (error) {
                console.log("This result catch", error);
                res.json(error.m)
            }
        }
        else{
            console.log(req.body);
            adminHelpers.updateProduct(req.body, req.params.id,false).then(() => {
                try {
                    console.log("data changed");
                    res.redirect('/admin');
                } catch (error) {
                    console.log(error);
                }
            })
        }
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
