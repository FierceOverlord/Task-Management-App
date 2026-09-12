import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { destroyFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const generateAccessAndRefreshTokens = async(userId) => {
    console.log("Enter token generation for: ", userId)
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

    const {fullname, email, username, password} = req.body;

    if(
        [fullname, username, email, password].some((field) => field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
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

  const {email, username, password} = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({
    $or: [{username},{email}],
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


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1},
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))
})


const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully."))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully."))
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const {email, username} = req.body

    if (!(email || username)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {fullname, email},
        },
        { new : true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account detials updated successfully."))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails
};