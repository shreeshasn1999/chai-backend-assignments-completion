import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const totalSubsciberCount = await Subscription.countDocuments({
    channel: req.user._id,
  });

  if (Number.isNaN(totalSubsciberCount)) {
    throw new ApiError(500, "Error while fetching subscriber stats");
  }

  const VidsObj = await Video.aggregate([
    {
      $group: {
        _id: new mongoose.Types.ObjectId(req.user._id),
        vidsCount: { $sum: 1 },
        vidsViewCount: { $sum: "$views" },
      },
    },
  ]);

  if (!VidsObj || (Array.isArray(VidsObj) && VidsObj.length > 0)) {
    throw new ApiError(500, "Error while fetching Video related stats");
  }

  const totalLikedBy = await Like.countDocuments({ likedBy: req.user._id });

  if (Number.isNaN(totalLikedBy)) {
    throw new ApiError(500, "Error while fetching Video related stats");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, {
        totalSubsciberCount,
        totalVideosCount: VidsObj.vidsCount,
        totalVideoViews: VidsObj.vidsViewCount,
        totalLikedBy,
      })
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const channelVideos = await Video.aggregate([
    {
      $match: { owner: req.user._id },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
  ]);

  if (!channelVideos) {
    throw new ApiError(500, "Error while fetching channel videos");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelVideos, "Channel videos fetched successfully")
    );
});

export { getChannelStats, getChannelVideos };
