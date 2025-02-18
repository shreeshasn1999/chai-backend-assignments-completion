import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  const { _id: owner } = req.user;

  if (!(name || description)) {
    throw new ApiError(400, "Name and Description both are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(500, "Error while creating playlist in MongoDB");
  }

  const playlistCompleteDetails = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlist._id),
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
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlistCompleteDetails,
        "Playlist successfully created"
      )
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) {
    throw new ApiError(400, "User ID missing");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Not a valid ID");
  }

  const playlists = await Playlist.find({ owner: userId });

  if (!playlists) {
    throw new ApiError(500, "Error fetching playlists from MongoDB");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID missing");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Not a valid ID");
  }

  try {
    const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
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
      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videos",
          pipeline: [
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
          ],
        },
      },
      { $unwind: "$owner" },
    ]);
    if (!playlist) {
      throw new ApiError(404, "Playlist does not exist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      `Error while fetching playlist from MongoDB ${error}`
    );
  }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId) {
    throw new ApiError(500, "Playlist ID missing");
  }

  if (!videoId) {
    throw new ApiError(500, "Video ID missing");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(500, "Playlist ID is invalid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(500, "Video ID is invalid");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  console.log(updatePlaylist);

  if (!updatedPlaylist.videos.includes(videoId)) {
    throw new ApiError(500, "Error while adding video to playlist in MongoDB");
  }

  const updatePlaylistComplete = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
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
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  console.log(updatePlaylistComplete);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylistComplete, "Video added successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!playlistId) {
    throw new ApiError(500, "Playlist ID missing");
  }

  if (!videoId) {
    throw new ApiError(500, "Video ID missing");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(500, "Playlist ID is invalid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(500, "Video ID is invalid");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  if (updatedPlaylist.videos.includes(videoId)) {
    throw new ApiError(
      500,
      "Error while removing video from playlist in MongoDB"
    );
  }
  const updatePlaylistComplete = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
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
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylistComplete, "Video removed successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is missing");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(500, "Playlist ID is invalid");
  }

  try {
    await Playlist.findByIdAndDelete(playlistId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while deleting from Mongo DB");
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID missing");
  }

  if (!(name || description)) {
    throw new ApiError(400, "Name and Description cannot be empty");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { name, description },
    { new: true }
  );

  if (
    !updatedPlaylist ||
    updatedPlaylist.name !== name ||
    updatedPlaylist.description !== description
  ) {
    throw new ApiError(500, "Error while updating MongoDB with new values");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
