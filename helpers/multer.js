const multer = require('multer');
//  let storage = multer.diskStorage({
//     filename:function(req,file,cb){
//         cb(null,file.originalname);
//     }
//  });
let storage = multer.memoryStorage()
const upload = multer({ storage: storage })

module.exports = upload;