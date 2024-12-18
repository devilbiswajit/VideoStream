import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRET
    });

const uploadOnCloudinary = async (localFilePath)=>{
        try {
            // filepath not found return 
            if(!localFilePath){
                return null;
            }
            //if found then upload
            const response =await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto"
            })
            console.log("The uploaded cloudinary url is",response.url);
            //after uploading unlink the temporarily saved file from the local server
            fs.unlinkSync(localFilePath); // unlink in synchronous way
            return response;

            
        } catch (error) {
            fs.unlinkSync(localFilePath);
            return null;
        }
    }

    export {uploadOnCloudinary}
    
   