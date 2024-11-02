var express = require('express');
const productHelpers = require("../helpers/admin-helpers")
const userHelpers = require("../helpers/user-helpers");
const emailHelpers = require("../helpers/email-helper");
const { route } = require('./admin');
const adminHelpers = require('../helpers/admin-helpers');
var cloudinary = require('../helpers/cloudinary')
var router = express.Router();




const verifyLogin = (req, res, next) => {
    //console.log("CHecking Loged in or not")
    if (req.session.user) {
        next()
    } else {
        res.redirect('/login')
    }
};
function nameModify(name) {

    name = name.split(' ')[0]
    return name
}



router.get('/', async function (req, res, next) {
    
    let user = req.session.user
    console.log("User =>",user," Displaying from /")
    let cartCount=null;
    if(req.session.user){
        req.session.user.name2 = nameModify(req.session.user.name)
        cartCount = await userHelpers.getCartCount(req.session.user._id)
    }
    //console.log("\nFrom user.js pritnig session ")
    
    await productHelpers.getAllProducts().then((products) => {
        //console.log(products)
        res.render('user/view-products', { products, user ,cartCount})
    })
});



router.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/')
    } else {
        res.render('user/login', { "loginErr": req.session.userLoginErr })
        req.session.userLoginErr = false
    }

})



router.get('/signup', (req, res) => {
    res.render('user/signup')
})



router.post('/signup', (req, res) => {

    userHelpers.doSignup(req.body,res).then(async(response) => {
        console.log("Displaying @@@@@@@@@@@@@@@@@@@@@", response);
        
        req.session.user = response
        
        req.session.user.loggedIn = true
        req.session.user.isAdmin=false;
        
        emailHelpers.viewContent =  await emailHelpers.signUp(req.session.user)
        userHelpers.sendEmail(req.session.user,"New Account Created")
        res.redirect("/")

        //console.log(response)

    })
})



router.post('/login', (req, res) => {
    userHelpers.doLogin(req.body).then((response) => {
        
        if (response.status) {
            req.session.user = response.user
            req.session.user.loggedIn = true
            if (response.userRole ==='user'){
                req.session.user.isAdmin=false
            } else if (response.userRole ==='admin'){
                req.session.user.isAdmin = true
            }
            
            //console.log(req.session)
            res.redirect("/")
        } else {
            req.session.userLoginErr = "Invalid username or password"
            res.redirect("/login")
        }
    })

})


router.get('/logout', (req, res) => {
    req.session.user=null
    req.session.userLoggedIn=false
    res.redirect('/')
})



router.get('/cart', verifyLogin, async (req, res) => {
    let products = await userHelpers.getCartProducts(req.session.user._id)
    let total =await userHelpers.getTotalAmount(req.session.user._id)
    let user = req.session.user
    res.render('user/cart', { products, user,total })
})



router.get('/add-to-cart/:id',  (req, res) => {
    //console.log("Api call")
    if(req.session.user){
        userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
            //console.log("executing /")
            res.json({ status: true })
            //console.loo("after /")
        })
    }else{
        res.json({status:"log"})
    }
    

})



router.post('/change-product-quantity',(req,res)=>{
    userHelpers.changeProductQuantity(req.body).then(async (response)=>{
        response.total = await userHelpers.getTotalAmount(req.body.user)
        //console.log(response,response.total)
        res.json(response)
    })

})



router.get('/place-order',verifyLogin,async (req,res)=>{
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    //console.log(total)
    res.render('user/place-order',{total,user:req.session.user})
})



router.post('/place-order',verifyLogin,async(req,res)=>{
    //console.log('order request')
    //console.log(req.body)
    //console.log(req.body.paymentMethod)

    let product=await userHelpers.getCartProductList(req.body.userId)
    let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
    let usersProducts = await userHelpers.getSpecifiedProduct(req.session.user._id)
    //console.log("let details==>>>", usersProducts)

    //console.log(totalPrice);
    if(totalPrice==0){
        res.json({status:"zero"})
    }else{
        if (product) {
            //get specified products
            emailHelpers.viewContent = await emailHelpers.orderEmail(req.body, req.session.user, usersProducts, totalPrice)
            
            
            
            console.log("Print if request get or not");
            await userHelpers.placeOrder(req.body, product, totalPrice).then(async (orderId) => {
                if (req.body.paymentMethod === 'COD') {

                    //console.log("THis got executed");
                    userHelpers.sendEmail(req.session.user,"Product order Success")
                    res.json({ status: true })
                } else {
                    console.log("Reaahced here ", orderId._id, orderId._id.toString())
                    await userHelpers.generateRazorpay(orderId._id.toString(), totalPrice).then((response) => {
                        
                        //console.log("from generate Razorpay==>>",response.status,response);
                        res.json(response)
                    })
                }
            })
            
            
        } else if (product == false) {
            //console.log("CArting1");
            res.redirect('/cart')
        }
    }
    //console.log(product);
        
})



router.post('/order-success', verifyLogin,(req,res)=>{
    
    userHelpers.removeCartItems(req.session.user._id)
    res.render('user/order-success',{user:req.session.user})
})



router.get('/order',verifyLogin,async (req,res)=>{
    let orders=await userHelpers.getUserOrders(req.session.user._id)
    //console.log(orders);
    res.render('user/orders', { user: req.session.user, orders })
})



router.get('/view-order-products/:id', verifyLogin,async(req,res)=>{
    let products = await userHelpers.getOrderProducts(req.params.id)
    //console.log("Products for last display=>",products);
    res.render('user/view-order-products',{user:req.session.user,products})
})



router.post('/verify-payment', verifyLogin,(req,res)=>{
    console.log("Aftr verify ",req.body)
    userHelpers.verifyPayment(req.body).then(()=>{
        userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
           
            console.log("payment Success")
            userHelpers.sendEmail(req.session.user,"Product order Success",)
            res.json({status:true})
        })
    }).catch((err)=>{
        res.json({status:false,errMsg:''})
    })
})



router.get('/product/:id/:cate',async (req,res)=>{
    let cate=req.params.cate;
    let user = req.session.user
    let details=await userHelpers.getProductDetails(req.params.id)
    //console.log("Checking with id ===>>>",details);
    
    let cartCount = null;
    if (req.session.user) {
        cartCount = await userHelpers.getCartCount(req.session.user._id)
    }
    //console.log(cate)
    //console.log('category1==>>', cate)

    await userHelpers.getProductsCategory(cate).then((products) => {
        //console.log('category2==>>', products)
        res.render('user/product', { details, user, products, cartCount })
    })
    
    
})


router.get('/helpfaq',(req,res)=>{
    let user = req.session.user
    res.render('user/helpfaq',{user})
})

router.get('/privacy', (req, res) => {
    let user = req.session.user
    res.render('user/privacy', { user })
})


router.get('/about', (req, res) => {
    let user = req.session.user
    res.render('user/about', { user })
})


router.post('/subscribe',(req,res)=>{
    
    userHelpers.subscribe(req.body.email,res)
})

router.get('/test', (req, res) => {

    
})


module.exports = router;
