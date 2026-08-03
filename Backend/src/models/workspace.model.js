import mongoose, { Schema } from "mongoose"

const workspaceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                role: {
                    type: String,
                    enum: ["owner", "admin", "member", "viewer"],
                    default: "member"
                },
                joinedAt: {
                    type: Date,
                    default: Date.now
                },
                invitedBy: {
                    type: Schema.Types.ObjectId,
                    ref: "User"
                }
            }
        ],
        settings: {
            defaultTaskView: {
                type: String,
                enum: ["list", "board"],
                default: "list"
            },
            allowMemberInvites: {
                type: Boolean,
                default: false
            }
        }
    },
    { timestamps: true }
)

// Fast lookup for RBAC checks: "does this user have at least X role in this workspace"
workspaceSchema.index({ "_id": 1, "members.user": 1 }, {unique: true})

export const Workspace = mongoose.model("Workspace", workspaceSchema)