var db=require("../config/connection")
var collection=require('../config/collections')
//var {ObjectId: toObjectId} = require('mongodb')
const mongoose = require('mongoose');
const { ObjectId } = require("bson");
var cloudinary = require('../helpers/cloudinary')

function toObjectId(id) {
    return new mongoose.Types.ObjectId(id);
}

module.exports={
    addProduct:(product,callback)=>{
        //console.log(product)

        db.get().collection('product').insertOne(product).then((data) => {
            // Check if the insertion was successful
            console.log(data.insertedCount);
            callback({ ...product, _id: data.insertedId }); // Returns the full product object including _id
            
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    
    deleteProduct:(proId)=>{
        
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: toObjectId(proId)}).then((response)=>{
                //console.log(response)
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: toObjectId(proId) }).then((product)=>{
                    resolve(product)
                })
            } catch (error) {
                resolve(null)
            }
        })
    },
    updateProduct:(proDetails,proId,c)=>{
        return new Promise((resolve,reject)=>{
            if(c===false){
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: toObjectId(proId) }, {
                    $set: {
                        name: proDetails.name,
                        category: proDetails.category,
                        price: proDetails.price,
                        description: proDetails.description,

                    }
                }).then((response) => {
                    resolve()
                })
            }else if(c===true){
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: toObjectId(proId) }, {
                    $set: {
                        name: proDetails.name,
                        category: proDetails.category,
                        price: proDetails.price,
                        description: proDetails.description,
                        secureUrl: proDetails.secureUrl,
                        publicId: proDetails.publicId,
                        uploadDate: proDetails.uploadDate

                    }
                }).then((response) => {
                    resolve()
                })
            }
            
        })
    },
    getAllUsers:()=>{
        return new Promise((resolve,reject)=>{
            let users = db.get().collection(collection.USER_COLLECTION).find().toArray().then((response)=>{
                //console.log("Listing==>>", response, "Type of users==>>>", typeof response);
                resolve(response)
            });
            
        })
    },


    getAllUserOrders:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                
                {$lookup:{
                    from:'users',
                    localField:'userId',
                    foreignField:"_id",
                    as:"userData"
                }},
                {$unwind:"$userData"},
                {$project:{
                    "userData.password":0,
                    "userData.role":0,
                    "userData._id":0,
                    "deliveryDetails":0,
                    "totalAmount":0
                }},
                {$sort:{"userData.name":1}}
            ]).toArray().then((response)=>{
                let num=0;
                response.forEach((element,i) => {
                    num = 0;
                    element.products.forEach((e)=>{
                        
                        num += e.quantity
                    })
                    element.numberOfItems=num;
                    
                });
                resolve(response)
                
            });
            
            
        })
    },


    getOrderUser:async (oId)=>{
        return new Promise(async (resolve,reject)=>{
        try {
            await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                { $match: { _id: toObjectId(oId) } },
                { $unwind: "$products" },
                { $lookup: { from: "product", localField: "products.item", foreignField: "_id", as: "items" } },
                { $addFields: { "productNew.details": { $arrayElemAt: ["$items", 0] }, "productNew.quantity": "$products.quantity" } },
                {
                    $group: {
                        _id: "$_id",
                        deliveryDetails: { $first: "$deliveryDetails" },
                        userId: { $first: "$userId" },
                        paymentMethod: { $first: "$paymentMethod" },
                        totalAmount: { $first: "$totalAmount" },
                        date: { $first: "$date" },
                        status: { $first: "$status" },
                        products: { $push: "$productNew" }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userData"
                    }
                },
                { $unwind: "$userData" },
                {
                    $project: {
                        userId: 0,
                        "userData.role": 0,
                        "userData.password": 0,
                    }
                }
            ]).toArray().then((resp) => {
                //console.log("====>>>",resp);
                //console.log(resp[0].products[0]);
                resolve(resp)

            })          
        } catch (error) {
            resolve(d=null)
        }
        })
        
        
        
    },
    findProduct : async(id)=>{
        return new Promise(async(resolve,reject)=>{
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne(toObjectId(id))
            //console.log("New fiountion findOne ",product);
            resolve(product)
            
        })
    },

    imageUpload:async (req,res,image)=>{
        console.log(typeof image);
        let exten
        if(typeof image !== "string"){
            exten = image.originalname.split('.').pop().toLowerCase();
            if (image.size >= 5300000 || !["jpg", "png", "jpeg"].includes(exten)) {
                console.log("file size problem");

                return res.send("<h1 style='color:red;font-family: sans-serif;'>File upload  was not a Success because file size exceeded or file type was not supported :(</h1>")
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
                    //return res.send(`<code>Image uploaded Succesfully</code><br><h3>View them below</h3><br><a href="/images">View</a>`)

                    require('./admin-helpers').addProduct(req.body, (id) => {
                        console.log("callback");
                        let user = req.session.user
                        require('./admin-helpers').getAllProducts().then((products) => {
                            //console.log(products)
                            console.log("function finished");

                            //res.render('admin/view-products', { products, user })
                        })
                    })

                })
                resultOfUpload.end(image.buffer);
            } catch (e) {
                console.log("", e.message);
                res.json(e.message);
            }
        } else if (typeof image === "string"){
            console.log("enter link part ");
            try {
                cloudinary.uploader.upload(image, (err, result) => {
                    if (err) {
                        console.log(err.message);
                        res.send(`<h5 style="color:#005cdc;font-size:30px ;font-family:sans-serif">${err.message}</h5>`);
                        return
    
                    }
                    //console.log(result);
                    req.body['secureUrl'] = result.secure_url
                    req.body['publicId'] = result.public_id
                    req.body['uploadDate'] = result.created_at
                    console.log(req.body);
                    //return res.send(`<code>Image uploaded Succesfully</code><br><h3>View them below</h3><br><a href="/images">View</a>`)
    
                    require('./admin-helpers').addProduct(req.body, (id) => {
                        console.log("callback");
                        let user = req.session.user
                        require('./admin-helpers').getAllProducts().then((products) => {
                            //console.log(products)
                            console.log("function finished");
    
                            //res.render('admin/view-products', { products, user })
                        })
                    })
                    console.log(result.original_filename,);
                    console.log("Upload via link succes");
                    
    
                })
            } catch (error) {
                res.json(e.message)
            }
        }else{
            return res.json({message:"nothing was performed or done"})
        }


    },


    imageDelete: async (res, publicId)=>{
        const result = await cloudinary.uploader.destroy(publicId, { invalidate: true })
        if (result.result !== "ok") {
            return res.status(500).json({ error: "Failed to delete existing image" });
        }
        console.log("Image deleted successfully from Cloudinary")
    }

}