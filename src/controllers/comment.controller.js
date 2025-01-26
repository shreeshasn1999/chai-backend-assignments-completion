import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) {
    throw new ApiError(400, "Video ID missing");
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(videoId),
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
      },
    },
    { $unwind: "$owner" },
    { $unwind: "$video" },
  ]);
  const options = { page, limit };

  try {
    const commentsOfVid = await Comment.aggregatePaginate(
      commentAggregate,
      options
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, commentsOfVid, "Comments fetched Successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error fetching from MongoDB");
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;
  const { videoId: video } = req.params;
  const { _id: owner } = req.user;
  if (!content) {
    throw new ApiError(400, "Content is a required field");
  }
  try {
    const newComment = await Comment.create({ content, video, owner });
    return res
      .status(200)
      .json(new ApiResponse(200, newComment, "Comment has been created"));
  } catch (error) {
    throw new ApiError(500, "Error while writing to MongoDB");
  }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is a required field");
  }

  try {
    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
      content,
    });
    if (updatedComment.content === content) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment has been updated"));
    }
  } catch (error) {
    throw new ApiError(500, "Error while updating to MongoDB");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  try {
    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (deletedComment)
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Deleted Comment Successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while deleting from MongoDB");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
