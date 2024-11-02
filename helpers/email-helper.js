const fss = require('fs');
const ejs = require('ejs');



module.exports={
    

    orderEmail: async (details, user, usersProducts, totalPrice)=>{
        usersProducts = usersProducts[0].productDetails
        completeData = {
            name: user.name,
            email: user.email,
            address: details.address,
            mobile: details.mobile,
            pincode: details.pincode,
            method: details.paymentMethod,
            totalPrice: totalPrice,
            numberOfItems: usersProducts.length,
            items: usersProducts
        }

        let attachments = [
            {
                filename: 'logo.jpg',   
                path: __dirname + '/../public/images/ico.jpg', 
                cid: 'unique@logo.cid' 
            },
        ]
        //  usersProducts.forEach((element,i) => {
        //      attachments.push({
        //         filename:"product"+(i+1),
        //         path:__dirname + "/../public/product-images/"+element.product._id+".jpg",
        //          cid: 'unique@product'+(i+1)+'.cid'
        //     })
            
        // });
        completeData.attachments=attachments;
        //console.log("Complte data whole===>>>",completeData.items[0].product);

        let htmlContent = await ejs.renderFile(__dirname + "/order.ejs", { completeData })
        //console.log("Pirnting html",htmlContent);
        
        const returnValues = {
            html:htmlContent,
            images:attachments,
            
        }
        return returnValues
        
        
    },



    signUp:async (userData)=>{
        
        
        //console.log(__dirname);
        let attachments = [
            {
                filename: 'logo.jpg',
                path: __dirname + '/../public/images/ico.jpg',
                cid: 'unique@logo.cid'
            },
        ]
        const htmlContent = await ejs.renderFile(__dirname + "/sign-up.ejs",{userData})
        const returnValues = {
            html: htmlContent,
            images: attachments,

        }
        return returnValues
        
    },



    theSendMail:(user,html,product)=>{
        

    }


    

    
}
