var express = require('express');
var adminHelpers = require("../helpers/admin-helpers")
var router = express.Router();
var fs = require('fs');
const userHelpers = require('../helpers/user-helpers');


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

router.post('/add-products',(req,res)=>{
    //console.log(req.body)
    //console.log(req.files.image)
    
    
    console.log("printing");
    
    adminHelpers.addProduct(req.body,(id)=>{
        console.log("callback");
      let user = req.session.user
      let image=req.files.image
      
      image.mv("./public/product-images/"+id+".jpg",(err)=>{
        if(!err){
          adminHelpers.getAllProducts().then((products) => {
            //console.log(products)
            res.render('admin/view-products', { products, user})
          })
        }else{
          console.log(err)
        }
      })
    })
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
