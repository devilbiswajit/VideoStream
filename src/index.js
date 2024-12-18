// require('dotenv').config({path:'./env'});
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})
connectDB()

































//  (async ()=>{
//     try {

//       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//       app.on("error",(error)=>{
//            console.log("Error is",error);
//            throw error;
//       })

//       app.listen(process.env.PORT,()=>{
//          console.log(`App is hearing at Port:-${process.env.PORT}`)
//       })

        
//     } catch (error) {
//         console.log(error);
//         throw error;
//     }

// })();