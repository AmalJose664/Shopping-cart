var db = require("../config/connection")
var collection = require('../config/collections')
const bcyprt= require('bcrypt')

const mongoose = require('mongoose');
//let ObjectId =    mongoose.Types.ObjectId;
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const { email } = require("./email-helper")
const emailHelper = require("./email-helper")




var instance = new Razorpay({
    key_id: 'rzp_test_C5l9MdsxWxpNUe',
    key_secret: 'O9U5j9Ph0y24mMjCYsfwP7g4',
});

function toObjectId(id) {
    return  new mongoose.Types.ObjectId(id);
}

module.exports={
    doSignup:(userData,res)=>{
        userData.role="user"
        return new Promise(async (resolve,reject)=>{
            let emailExist=false;
             emailExist = await db.get().collection(collection.USER_COLLECTION).find({email:userData.email}).toArray()
            //console.log("Returned value===>",emailExist ,typeof emailExist);
            //console.log(emailExist[0]);
            
            if(!emailExist[0]){
                userData.password = await bcyprt.hash(userData.password, 10)
                console.log("HASHED")
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    //console.log("Displaying @@@@@@@@@@@@@@@@@@@@@",{ ...userData, _id: data.insertedId });
                    
                    resolve({ ...userData, _id: data.insertedId })

                })
            }else{
                res.render('user/signup',{exist:true,email:userData.email}) 
            }
            
            
           
        })
       
    },
    doLogin:(userData)=>{
        
        return new Promise(async(resolve,reject)=>{
            //let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
            if(user){
                bcyprt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        response.user = user
                        response.status = true
                        console.log("login success")
                        response.userRole = user.role
                        resolve(response)

                        
                    }else{
                        console.log("Login Failed")
                        resolve({status:false})
                    }
                })
            }else{
                console.log("Email not found");
                resolve({status:false})
            }
        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item: toObjectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            //console.log("going to insert")
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: toObjectId(userId)})
           
            // console.log("Checking cart exits")
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                //console.log("Number",proExist)
                if(proExist!=-1){
                    //console.log("cart Product quantity updation next")
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: toObjectId(userId), 'products.item': toObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                        
                    ).then(() => {
                        resolve()
                    })
                }else{
                    //console.log("cart Product new add")
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: toObjectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                   
                }
                //console.log("cart updation finsished")


                //console.log("cart updation ")
                
            }else{
                //console.log("Creating new cart for new user")
                let cartObj={
                    user: toObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    //console.log("inserted product")
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: toObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },{
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
                // {
                //     $lookup:{
                //         from:collection.PRODUCT_COLLECTION,
                //         let:{proList:'$products'},
                //         pipeline:[
                //             {
                //                 $match:{
                //                     $expr:{
                //                         $in:['$_id','$$proList']
                //                     }
                //                 }
                //             }
                //         ],
                //         as:'cartItems'
                //     }
                // }
            ]).toArray()
            resolve(cartItems)
        })
    }, getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user:toObjectId(userId) })
            
            if (cart) {
                let ct=0;
               
                //console.log("printing cot");
                cart.products.forEach((value)=>{
                    //console.log("Pritng value ",value.quantity);
                    ct+=value.quantity
                    
                })
                count = ct
            }
            resolve(count)
        })
    },






    changeProductQuantity:(details)=>{
        details.count = parseInt(details.count)
        return new Promise((resolve, reject) => {
             if (details.count == -1 && details.quantity == 1) {
                
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: toObjectId(details.cart) },
                        {
                            $pull: { products: { item: toObjectId(details.product)}}
                        }

                    ).then((response) => {

                        resolve({removeProduct:true})
                    })
               
             }else{
                 db.get().collection(collection.CART_COLLECTION)
                     .updateOne({ _id: toObjectId(details.cart), 'products.item': toObjectId(details.product) },
                         {
                             $inc: { 'products.$.quantity': details.count }
                         }

                     ).then((response) => {

                         resolve({status:true})
                     })
             }
            
        })
    },


    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: toObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                // {
                //     $group: {
                //         _id: null,
                //         total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                //     }
                // }
                // {
                //     $lookup:{
                //         from:collection.PRODUCT_COLLECTION,
                //         let:{proList:'$products'},
                //         pipeline:[
                //             {
                //                 $match:{
                //                     $expr:{
                //                         $in:['$_id','$$proList']
                //                     }
                //                 }
                //             }
                //         ],
                //         as:'cartItems'
                //     }
                // }
            ]).toArray()
            let total=0
            //console.log(total)
            result.forEach((value) => {
                // console.log("Pritng value + *value.quantity");
                // console.log(value.quantity);
                // console.log(value.product.name);
                // console.log(value.product.price);
                let multiple = value.quantity * value.product.price
                //console.log(multiple)
                total+=multiple;
                //console.log(total)

            })

            resolve(total)
        })
    },


    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
             //console.log("Order Address and stuff =>" , order)
            // console.log("List of products  form cart=>" , products)
            // console.log("total price =>" , total)
            let status = order.paymentMethod==='COD'?'placed':'pending'
            let orderObj ={
                deliveryDetails:{
                    mobile:order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: toObjectId(order.userId),
                paymentMethod: order.paymentMethod,
                products:products,
                totalAmount:total,
                date:new Date(),
                status:status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                if (response) {
                    // Merge orderObj with the inserted _id
                    //console.log('Print order id =========>>>>>>>>',{ ...orderObj, _id: response.insertedId },"<<<<<<<<<+================Finished ");
                    resolve({ ...orderObj, _id: response.insertedId }); // Resolves with the full order object including _id
                } else {
                    resolve(false); // No insertion occurred
                }
                
            })
        })
    },



    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: toObjectId(userId)})
            // console.log("Cart =>",cart);
            if(cart){
                resolve(cart.products)
            }else{
                //console.log("CArting0");
                resolve(false)
            }
        })
        
    },


    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            //console.log(userId)
            
            let orders = await db.get().collection(collection.ORDER_COLLECTION).
                find({ userId: toObjectId(userId)}).toArray()
            //console.log(orders);
            resolve(orders)
        })
    },



    getOrderProducts: (orderId)=>{
        return new Promise(async(resolve,reject)=>{
            
            try {
                let orderItems = "uii"
                orderItems =  await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: { _id: toObjectId(orderId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup:{
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },
                    {
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }
                ]).toArray()
                console.log("==>>or",orderItems);
                resolve(orderItems)
                
            } catch (error) {
                resolve(orderItems=null)
            }
        })
    },




    generateRazorpay:(orderId,total)=>{
        return new Promise ((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId
            };
            //console.log(options);
            
            instance.orders.create(options, function (err, order) {
                console.log(order);
                if(err){
                    console.log("ERROR==>>",err);
                }else{
                    //console.log("Pirnting=>>>>  ", order);
                    resolve(order)
                }
            });
        })
    },



    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'O9U5j9Ph0y24mMjCYsfwP7g4')
            
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }

        })
    },


    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: toObjectId(orderId)},{
                $set:{status:'Placed'}
            }).then(()=>{
                resolve()
            })
        })
    },



    getProductDetails:(productId)=>{
        return new Promise(async (resolve,reject)=>{
            let product=false
            try {
                await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: toObjectId(productId)}).then((response)=>{
                    
                    resolve(response)
                    //console.log("Details worked=========================");
                })
            } catch (error) {
                product = true
                //console.log("Details worked=========================ERRR");
            }
           // console.log("Details worked=========================ERRR2");
            if(product==true){
                //console.log("Details worked=========================ERRR3");
                resolve(product = null)
            }
        })
    },


    getProductsCategory:(cate)=>{
        return new Promise((resolve, reject) => {
            let cProducts=db.get().collection(collection.PRODUCT_COLLECTION).find({category: cate}).toArray()
            resolve(cProducts)
        })
    },


    removeCartItems:(userId)=>{
        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: toObjectId(userId) })
    },


    passwordTest:async()=>{
        let p = "9090"
         p = await bcyprt.hash(p, 10)
         console.log("password===>>",p);
    },

    getSpecifiedProduct: (userId)=>{
        
        return new Promise((resolve,reject)=>{
            let usersProducts = db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: toObjectId(userId) // Match only documents for the specified user
                    }
                },
                {
                    $unwind: "$products"
                },
                {
                    $lookup: {
                        from: "product",
                        localField: "products.item",
                        foreignField: "_id",
                        as: "productDetail"
                    }
                },
                {
                    $unwind: "$productDetail"
                },
                {
                    $group: {
                        _id: "$user",
                        productDetails: {
                            $push: {
                                product: "$productDetail",
                                quantity: "$products.quantity"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        user: "$_id",
                        productDetails: 1
                    }
                }
            ]).toArray()

            resolve(usersProducts)
        })
    },

    sendEmail:(user,text)=>{
        
        
        
        const mail = "renderstest446446@gmail.com" // Your email address
        const pass = "wcjx sgxa szqo hwdx" // Your email password or app password

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: mail,
                pass: pass,
            },
        })



        const mailOptions = {
            from: mail,    // Sender address
            to: user.email, // List of recipients
            subject: 'ShoppinG Cart',  // Subject line
            text: text, // Plain text body
            html: emailHelper.viewContent.html,
            attachments: emailHelper.viewContent.images
            
            
        };
        //console.log("Complete data of email===>>>",mailOptions.to,text);
        
        transporter.sendMail(mailOptions, (err, info) => {
             if (err) {
                 console.log("Email Errors ===>>>>", err);
                 return
             }
             console.log('Email sent: ' + info.response ,"To ",user.email); // Logs the server response
             console.log('Message ID: ' + info.messageId); // Logs the message ID
             console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info)); // Logs a preview URL if using a testing service like Ethereal
         })
        
        // console.log("sendding details===>>",mailOptions.attachments);
       
    },


    subscribe:async (email,res)=>{
        
        await db.get().collection(collection.SUBS_COLLECTION).findOne({email:email}).then(async (response)=>{
            if(!response){
                
                await db.get().collection(collection.SUBS_COLLECTION).insertOne({ email: email })
                res.json({ status: true })
            }
            else{
                res.json({status:false})
            }
            
        })
        
        
    },

}