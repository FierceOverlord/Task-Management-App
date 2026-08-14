import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { destroyFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

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
