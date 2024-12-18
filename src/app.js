import express, { json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({
    extended:true,
    limit:"16kb"
}))
app.listen(process.env.Port || 8000,()=>{
        console.log(`Server is listening at port:-${process.env.Port}`)
    })

app.use(express.static("public"));

app.use(cookieParser());

//routes import
import userRouter from './routes/user.routes.js'
//usage of routes
app.use("/api/v1/users",userRouter);

export {app};