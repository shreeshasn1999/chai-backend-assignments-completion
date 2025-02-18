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

  if (!userId) {
    throw new ApiError(500, "User Id missing");
  }

  const userToFetchVideosOf = await User.findById(userId);

  if (!userToFetchVideosOf) {
    throw new ApiError(500, "User does not exist");
  }

  const sort = {};
  sort[sortBy] = sortType;
  const options = { page, limit, sort };
  const sanitizedQuery = escapeRegex(query);

  const myAggregate = Video.aggregate([
    {
      $match: {
        $and: [
          {
            owner: new mongoose.Types.ObjectId(userId),
          },
          {
            $or: [
              {
                title: { $regex: sanitizedQuery, $options: "i" },
              },
              {
                description: { $regex: sanitizedQuery, $options: "i" },
              },
            ],
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
        pipeline: [
          {
            $project: {
              fullName: 1,
              email: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);
  const videos = await Video.aggregatePaginate(myAggregate, options);

  if (!videos) {
    throw new ApiError(500, "Error while fetching data from MongoDB");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos.docs, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  const { _id } = req.user;

  console.log(req);

  const videoFilePath = req.files?.videoFile[0]?.path;

  if (!videoFilePath) throw new ApiError(400, "Video file missing");

  const thumbnailPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailPath) throw new ApiError(400, "Thumbnail missing");

  const fileStream = createReadStream(videoFilePath);
  const duration = await getVideoDurationInSeconds(fileStream);
  console.log(duration);
  const videoFile = await uploadOnCloudinary(videoFilePath);
  const thumbnail = await uploadOnCloudinary(thumbnailPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file missing");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail missing");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
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

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  if (!video)
    return res.status(404).json(new ApiResponse(404, {}, "Video not found"));

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // TODO: update video details like title, description, thumbnail
  if (!videoId) {
    throw new ApiError(400, "Video ID missing");
  }

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description all required");
  }

  const thumbnailPath = req.file?.path;

  if (!thumbnailPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoToUpdate = await Video.findById(videoId);

  const thumbnailDeletion = await deleteFromCloudinary(
    videoToUpdate.thumbnail,
    "image"
  );

  if (thumbnailDeletion.result === "error") {
    throw new ApiError(500, "Error while deleting old thumbnail");
  }

  const thumbnailUpdated = await uploadOnCloudinary(thumbnailPath);

  if (!thumbnailUpdated) {
    throw new ApiError(500, "Error while uploading new thumbnail");
  }

  const mongoRes = await Video.findByIdAndUpdate(
    videoId,
    { title, description, thumbnail: thumbnailUpdated.url },
    { new: true }
  ).select("title description thumbnail owner");

  return res
    .status(200)
    .json(new ApiResponse(200, mongoRes, "Video details updated successfully"));
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

  console.log(videoFile, thumbnail);

  const videoFileDeletion = await deleteFromCloudinary(videoFile, "video");

  if (videoFileDeletion.result === "error")
    throw new ApiError(500, videoFileDeletion.message);

  const thumbnailDeletion = await deleteFromCloudinary(thumbnail, "image");

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
      [
        {
          $set: {
            isPublished: {
              $not: "$isPublished",
            },
          },
        },
      ],
      { new: true }
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
    console.log(error);
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
