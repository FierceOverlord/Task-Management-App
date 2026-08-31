import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js";
import {
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    registerUser,
    loginUser,
    logoutUser
} from "../controllers/user.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(registerUser)

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-acoount").post(verifyJWT, updateAccountDetails)


export default router;