import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { createReadStream } from "fs";
import { getVideoDurationInSeconds } from "get-video-duration";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  //TODO: get all videos based on query, sort, pagination
  const options = { page, limit, sort: [sortBy, sortType] };
  const sanitizedQuery = escapeRegex(query);

  const myAggregate = Video.aggregate([
    {
      $match: {
        $or: [
          {
            title: { $regex: sanitizedQuery, $options: "i" },
          },
          {
            description: { $regex: sanitizedQuery, $options: "i" },
          },
        ],
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
      $unwind: "owner",
    },
  ]);
  const videos = await Video.aggregatePaginate(myAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  const { _id } = req.user;

  const videoFilePath = req.files?.videoFile[0]?.path;

  if (!videoFilePath) throw new ApiError(400, "Video file missing");

  const thumbnailPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailPath) throw new ApiError(400, "Thumbnail missing");

  const fileStream = createReadStream(videoFilePath);
  const duration = await getVideoDurationInSeconds(fileStream);
  const videoFile = await uploadOnCloudinary(avatarLocalPath);
  const thumbnail = await uploadOnCloudinary(coverImageLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file missing");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail missing");
  }

  const video = await Video.create({
    videoFile,
    thumbnail,
    duration,
    title,
    description,
    isPublished: true,
    views: 0,
    owner: _id,
  });

  if (!video) {
    throw new ApiError(500, "Error while storing video in Mongo");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video has been uploaded and published"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!videoId) {
    throw new ApiError(400, "Video ID missing");
  }

  const video = await Video.findById(videoId);

  if (!video)
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const { title, description, thumbnail } = req.data;

  if (!videoId) {
    throw new ApiError(400, "Video ID missing");
  }

  if (!title || !description || !thumbnail) {
    throw new ApiError(400, "");
  }

  try {
    const mongoRes = await Video.findByIdAndUpdate(
      videoId,
      { title, description, thumbnail },
      { new: true }
    );
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video details updated successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while updating video details");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //TODO: delete video

  if (!videoId) {
    throw new ApiError(400, "Video Id missing");
  }

  const videoToBeDeleted = await Video.findById(videoId);

  if (!videoToBeDeleted) throw new ApiError(404, "Video not found");

  const { videoFile, thumbnail } = videoToBeDeleted;

  const videoFileDeletion = await deleteFromCloudinary(videoFile);

  if (videoFileDeletion.result === "error")
    throw new ApiError(500, videoFileDeletion.message);

  const thumbnailDeletion = await deleteFromCloudinary(thumbnail);

  if (thumbnailDeletion.result === "error")
    throw new ApiError(500, videoFileDeletion.message);

  try {
    const videoDelete = await Video.findByIdAndDelete(videoId);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while updating Mongo DB");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id missing");
  }

  try {
    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          isPublished: {
            $not: "$isPublished",
          },
        },
      },
      { new: True }
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          `Video ${video.isPublished ? "is" : "not"} published`
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error while toggling publish status");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
