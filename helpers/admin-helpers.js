var db=require("../config/connection")
var collection=require('../config/collections')
//var {ObjectId: toObjectId} = require('mongodb')
const mongoose = require('mongoose');

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
    updateProduct:(porDetails,proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:toObjectId(proId)},{
                $set:{
                    name:porDetails.name,
                    category: porDetails.category,
                    price: porDetails.price,
                    description: porDetails.description,

                }
            }).then((response)=>{
                resolve()
            })
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
        
        
        
    }

}