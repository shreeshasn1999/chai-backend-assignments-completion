import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle Subscription
  if (!channelId) {
    throw new ApiError(400, "Channel ID missing");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID is invalid");
  }

  const existingSubscription = await Subscription.find({
    channel: channelId,
    subscriber: req.user._id,
  });

  console.log("existingSubscription", existingSubscription);

  try {
    if (existingSubscription.length === 0) {
      const createdSub = await Subscription.create({
        channel: channelId,
        subscriber: req.user._id,
      });
      if (createdSub)
        return res
          .status(200)
          .json(new ApiResponse(200, {}, "Subscribed successfully"));
      else throw new ApiError(500, "Could not Subscribe properly");
    } else {
      const deletedSub = await Subscription.findByIdAndDelete(
        existingSubscription[0]._id
      );
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Error while writing to Mongo DB");
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log(channelId);
  if (!channelId) {
    throw new ApiError(400, "Channel ID missing!");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID is not valid");
  }

  const channelSubs = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
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
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
  ]);

  console.log(channelSubs);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelSubs,
        "User channel subscribers fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  console.log(subscriberId);
  if (!subscriberId) {
    throw new ApiError(400, "Channel ID missing!");
  }

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Channel ID is not valid");
  }

  const channelsSubbedTo = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "channelsSubbedTo",
      },
    },
  ]);

  console.log(channelsSubbedTo);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelsSubbedTo,
        "List of channels user has subbed to fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
