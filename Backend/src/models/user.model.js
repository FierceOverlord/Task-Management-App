import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // Cloudinary URL
            default: ""
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        },
        // Global platform-level flag (e.g. your own admin access to all workspaces).
        // Distinct from per-workspace role, which lives ONLY on Workspace.members[].
        isSuperAdmin: {
            type: Boolean,
            default: false
        }
        // NOTE: no workspaces[] here — Workspace.members[] is the single
        // source of truth for a user's role/membership in a workspace.
        // Duplicating it here would mean updating two documents every time
        // a role changes, and they will eventually drift out of sync.
        // To list "workspaces this user belongs to", query:
        //   Workspace.find({ "members.user": userId })
    },
    {
        timestamps: true
    }
)

// Hash password only when it's actually changed (prevents re-hashing on unrelated saves)
userSchema.pre('save', async function (next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const User = mongoose.model("User", userSchema)
