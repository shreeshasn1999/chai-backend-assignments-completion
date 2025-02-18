import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  const owner = req.user._id;
  if (!content) {
    throw new ApiError(400, "Content field is required");
  }

  const tweet = await Tweet.create({ content, owner });

  console.log(tweet);

  if (!tweet) {
    throw new ApiError(500, "Error while creating tweet in Mongo DB");
  }

  const completeTweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweet._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  console.log(completeTweet);

  return res
    .status(200)
    .json(new ApiResponse(200, completeTweet[0], "Created tweet successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "User ID missing!");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Not a valid ID");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: user._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  if (!tweets) {
    throw new ApiError(500, "Issue while fetching tweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully!"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new ApiError(400, "Tweet Id missing");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Not a valid id");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  );

  if (!tweet) {
    throw new ApiResponse(500, "Tweet not found/Tweet could not be updated");
  }

  const updatedTweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweet._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet[0], "Tweet updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Tweet Id missing");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Not a valid id");
  }

  try {
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet)
      throw new ApiError(500, "Error while deleting the Tweet");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while deleting the Tweet");
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
