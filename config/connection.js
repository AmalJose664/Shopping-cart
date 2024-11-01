
const mongoose= require('mongoose');
const state = {
    db:null,
    db2:null
}

module.exports.connect=function(done){
    const url = 'mongodb://localhost:27017'
    const dbname = 'shopping'

    mongoClient.connect(url, { useUnifiedTopology: true },(err,data)=>{
        if(err) {return done(err)}
        state.db2 = data.db(dbname)
        done()
        
    })
}

module.exports.connectToDatabase= async function () {

    const uri = process.env.uri || "mongodb+srv://amal446446:aVPCLGOoWEslqZhs@testing.66hfq.mongodb.net/shopping?retryWrites=true&w=majority&appName=Testing";
    try {
        await mongoose.connect(uri)
        db = mongoose.connection.db
        console.log("connected to database");
        state.db=db;
    } catch (e) {
        console.log("============================", e.message, "=====================");

    }

}

module.exports.get=function(){
    //console.log(state.db);
    
    return state.db
}
module.exports.get2 = function () {
    //console.log(state.db2);

    return state.db2
}