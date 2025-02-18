import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  const { _id: likedBy } = req.user;

  if (!videoId) {
    throw new ApiError(400, "Video Id missing");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Not a valid ID");
  }

  const videoLikeObj = await Like.findOne({ video: videoId, likedBy });

  if (!videoLikeObj) {
    const likeAdded = await Like.create({
      video: videoId,
      likedBy,
    });
    if (!likeAdded) throw new ApiError(500, "Error while adding to Mongo DB");
    return res.status(204).json(new ApiResponse(204, {}, "Liked the video"));
  } else {
    const likeRemoved = await Like.findByIdAndDelete(videoLikeObj._id);
    if (!likeRemoved)
      throw new ApiError(500, "Error while deleting from Mongo DB");
    return res
      .status(204)
      .json(new ApiResponse(204, {}, "Like removed from video"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  const { _id: likedBy } = req.user;

  if (!commentId) {
    throw new ApiError(400, "Comment Id missing");
  }

  const commentLikeObj = await Like.findOne({ likedBy, comment: commentId });

  if (!commentLikeObj) {
    const likeAdded = await Like.create({
      comment: commentLikeObj._id,
      likedBy,
    });
    if (!likeAdded) throw new ApiError(500, "Error while adding to Mongo DB");
    return res.status(204).json(new ApiResponse(204, {}, "Liked the comment"));
  } else {
    const likeRemoved = await Like.findByIdAndDelete(commentLikeObj._id);
    if (!likeRemoved)
      throw new ApiError(500, "Error while deleting from Mongo DB");
    return res
      .status(204)
      .json(new ApiResponse(204, {}, "Like removed from comment"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  const { _id: likedBy } = req.user;

  if (!tweetId) {
    throw new ApiError(400, "Tweet Id missing");
  }

  const tweetLikeObj = await Like.findOne({ likedBy, video: videoId });

  if (!tweetLikeObj) {
    const likeAdded = await Like.create({
      tweet: tweetLikeObj._id,
      likedBy,
    });
    if (!likeAdded) throw new ApiError(500, "Error while adding to Mongo DB");
    return res.status(204).json(new ApiResponse(204, {}, "Liked the tweet"));
  } else {
    const likeRemoved = await Like.findByIdAndDelete(tweetLikeObj._id);
    if (!likeRemoved)
      throw new ApiError(500, "Error while deleting from Mongo DB");
    return res
      .status(204)
      .json(new ApiResponse(204, {}, "Like removed from tweet"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const { _id: likedBy } = req.user;

  const likedVids = await Like.aggregate([
    {
      $match: {
        likedBy,
        video: { $ne: "" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          { $unwind: "$owner" },
        ],
      },
    },
    { $unwind: "$owner" },
    { $unwind: "$video" },
    {
      $project: {
        videos: 1,
      },
    },
  ]);

  if (!likedVids) {
    throw new ApiError(500, "Error while fetching Videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likedVids, "Liked Videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
