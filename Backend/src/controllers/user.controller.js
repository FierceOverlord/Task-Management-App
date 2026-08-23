import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { destroyFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const generateAccessAndRefreshTokens = async(userId) => {
    console.log("enter token generation for: ", userId)
    try{
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {accessToken, refreshToken}
    } catch (error) {
        console.log("Token gen err: ", error)
        throw new ApiError(500,
            "Something went wrong, while generating refersh and access token"
        );
    }
}


const registerUser = asyncHandler(async(req, res) => {

    const {fullname, email, password} = req.body;

    if(
        [fullname, email, password].some((field) => field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.")
    }

    const existedUser = await User.findOne({
        $or: [{fullname}, {email}],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const user = await User.create({
        fullname,
        email,
        password,
        avatar: avatar.url
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while resgistering the user.")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "User registered successfully."))
})


const loginUser = asyncHandler(async(req, res) => {
  // req.body -> data
  // username or email
  // find the user
  // password check
  // Access and Refresh Token
  // send cookie

  const {email, password} = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({
    $or: {email},
  });

  if (!user) {
    throw new ApiError(404, "User does not exist.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials.")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res 
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken,
            },
            "User Logged in Successfully"
        )
    );
});




export {
    registerUser,
    loginUser
};