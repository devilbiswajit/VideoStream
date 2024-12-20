import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId)=>{
     try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
      
     } catch (error) {
         throw new ApiError(500,"Something went wrong while generating access and refresh token")
     }
}


const registerUser = asyncHandler(async (req,res)=>{
          // get user details from frontend
          const {username,email,fullName,password} =req.body  
          console.log(req.body);
          
          //validation
          if([username,email,fullName,password].some((field)=>field?.trim()==="")){
             throw new ApiError(400,"All fields are required")
          } 
          
          //check email formatting to do
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
             console.log("Babua email toh thik daalde");
             throw new ApiError(400, "Invalid email address");
           }
          
          //check if user already exists
          const existedUser= await User.findOne({
             $or : [{username},{email}]
          })
          if(existedUser){
             console.log("User with email or username already exists");
             throw new ApiError(409, "User with email or username already exists");
          }

          //check for images and avatar
          const avatarLocalPath=req.files?.avatar[0]?.path;
          let coverImageLocalPath;
          if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
              coverImageLocalPath = req.files.coverImage[0].path
                  }
    

          if(!avatarLocalPath){
              throw new ApiError(400,"please upload the avtar")
          }

          //upload to cloudinary and check for avtar
          const avatar=await uploadOnCloudinary(avatarLocalPath);
          const coverImage=await uploadOnCloudinary(coverImageLocalPath);

          if(!avatar){
             throw new ApiError(400,"please upload the avtar")
          }

          //create user object and upload on db
          const user = await User.create(
            {
              fullName,
              avatar:avatar.url,
              coverImage:coverImage?.url || "",
              email,
              password,
              username:username.toLowerCase()
            }
          )
          console.log("user datas are ->",user);
          //remove password and refresh token fields from the response from mongodb after entering
          const createdUser= await User.findById(user._id).select(
            "-password -refreshToken"
          )
          //check for user creation
          if(!createdUser){
             throw new ApiError(500,"there is a problem in user creation")
          }
          //return response
          return res.status(201).json(
            new ApiResponse(200,createdUser,"user registration successful")
          )
})


const loginUser = asyncHandler(async(req,res)=>{
     //extract data from body
     const {email, username, password}=req.body
     //validate username and email
     if(!username && !email){
        throw new ApiError(400, "Invalid username or email")
     }
     //find the user
     const user = await User.findOne({
        $or:[{username},{email}]
     })

     if(!user){
       throw new ApiError(404,"User not found")
     }

     //password check
     const isPasswordValid= await user.isPasswordCorrect(password)
     if(!isPasswordValid){
       throw new ApiError(401,"Password entered is wrong")
     }

     //Generate access and refresh token and send to user
     const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

     const loggedInUser =await User.findById(user._id).select("-password -refreshToken")

     //send cookies and response
     const options ={
        httpOnly:true,
        secure:true
     }

     return res.status(200)
               .cookie("accessToken",accessToken,options)
               .cookie("refreshToken",refreshToken,options)
               .json(
                  new ApiResponse(
                     200,
                     {
                        user:loggedInUser, accessToken, refreshToken
                     },
                     "User logged In Successfully"
                  )
                    )
})


const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
     req.user._id,
   //   {
   //     $set:{ refreshToken:NULL}
   //   },
   //  or
   {
       $unset:{refreshToken:1}
      
   },
      
     {
        new:true
     }
  )
  const options= {
     httpOnly:true,
     secure:true
  }

  return res.status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(new ApiResponse(200,{},"User logged Out successfully"))
 })


 const refreshAccessToken = asyncHandler(async(req,res)=>{
       const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken
       if(!incomingRefreshToken){
          throw new ApiError(401, "unauthorized request")
       }

       try {
         const decodedToken = jwt.verify(cookieExtractedRefreshToken,process.env.REFRESH_TOKEN_SECRET)
         const user = await User.findById(decodedToken?._id)
         if(!user){
             throw new ApiError(401, "Invalid refresh token")
         }
  
         if(incomingRefreshToken!==user?.refreshToken){
           throw new ApiError(401, "Refresh token is either expired or used")
         }
  
         const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
         
         const options = {
            httpOnly:true,
            secure:true
         }
  
         return res.status(200)
                   .cookie("access token",accessToken,options)
                   .cookie("refresh Token",newRefreshToken,options)
                   .json(
                     new ApiResponse(200,
                          {accessToken,refreshToken:newRefreshToken},
                          "new refreshtoken generated"
                     )
                   )
       } catch (error) {
           throw new ApiError(401, error?.message || "Invalid refresh token")
       }
 })


 const changeCurrentPassword = asyncHandler(async(req,res)=>{
     const {oldPassword, newPassword} = req.body
     const user = await User.findById(req.user?._id)
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
     if(!isPasswordCorrect){
         throw new ApiError(400,"Invalid old password, try and check again")
     }
     user.password=newPassword
     await user.save({validateBeforeSave:false})

     return response.status(200)
                    .json(
                       new ApiResponse(200,{},"Password changed successfully")
                    )

 })


 const getCurrentUser = asyncHandler(async(req,res)=>{
       return res.status(200)
                 .json(new ApiResponse(200, req.user, "user fetched successfully"))
 })


 const updateAccountDetails = asyncHandler(async(req,res)=>{
      const {fullName, email} = req.body

      if(!fullName || !email){
         throw new ApiError(400, "All fields are required")
      }

      const user = await User.findByIdAndUpdate(
           req.user?._id,
           {
            $set:{
               fullName:fullName,
               email:email
           }
           },

         {new:true}
      ).select("-password")

 return res.status(200)
           .json( new ApiResponse(200,user,"Accounts details updated successfully"))

 })


 const updateUserAvatar = asyncHandler(async(req,res)=>{
      const avatarLocalPath = req.file?.path
      if(!avatarLocalPath){
         throw new ApiError(400,"Avatar is missing")
      }
      const avatar = await uploadOnCloudinary(avatarLocalPath)
      if(!avatar.url){
         throw new ApiError(400, "Error while uploading the avatar")
      }

      const user = await User.findByIdAndUpdate(
           req.user?._id,
           {
            $set:{
                avatar:avatar.url
           }
         },
         {new:true}
      ).select("-password")


      return res.status(200)
                .json(new ApiResponse(200, user, "Avatar updated successfully"))
 })


 const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const coverImageLocalPath = req.file?.path
   if(!coverImageLocalPath){
      throw new ApiError(400,"coverImage is missing")
   }
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   if(!coverImage.url){
      throw new ApiError(400, "Error while uploading the coverImage")
   }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
         $set:{
            coverImage:coverImage.url
        }
       },
       {new:true}
   ).select("-password")


   return res.status(200)
             .json(new ApiResponse(200, user, "coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
     const {username} = req.params
     if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
     }

     const channel = await User.aggregate([
      {
         $match:{
            username:username
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscriptions"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"subscribers"
            },
            subscriptionsCount:{
               $size:"subscriptions"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers"]},
                  then:true,
                  else:false
               }
            }
         }
      },
         
      {
            $project:{
               fullName:1,
               username:1,
               subscribersCount:1,
               subscriptionsCount:1,
               isSubscribed:1,
               coverImage:1,
               avatar:1
               
            }
         }
     ]      
     )
     
     if(!channel?.length){
        throw new ApiError(404,"Channel not found")
     }
     return res.status(200)
               .json(new ApiResponse(200,channel[0],"channel info fetched successfully"))
})


const getWatchHistory = asyncHandler(async(req,res)=>{
   const user = await User.aggregate([
        {
           $match:{
              _id:new mongoose.Types.ObjectId(req.user._id)
           }
        },
        {
          $lookup:{
              from:"videos",
              localField:"watchHistory",
              foreignField:"_id",
              as:"watchHistory",
              pipeline:[
                 {
                   $lookup:{
                      from:"users",
                      localField:"owner",
                      foreignField:"_id",
                      as:"owner",
                      pipeline:[
                        {
                           $project:{
                              fullName:1,
                              avatar:1,
                              username:1,
                              coverImage:1
                           }
                        }
                     ]
                   },
                   
                 },
                 {
                  $addFields:{
                     $first:"$owner"
                  }
                }
              ]
          }
        }
   ])

   return res.status(200)
             .json(new ApiResponse(200,user[0].watchHistory,"watchHistory fetched successfully"))
})


export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory
      }