import { ObjectId } from 'bson';
import GraphType from '../constants/graphType';
import NotificationType from '../constants/notificationType';
import { GraphModel, NotificationModel } from '../models/mongoose';

export async function createNewFollowerNotification(follower: string | ObjectId, following: string | ObjectId) {
  return await NotificationModel.updateOne({
    source: follower,
    sourceModel: 'User',
    target: following,
    type: NotificationType.NEW_FOLLOWER,
    userId: following,
  }, {
    message: '',
    source: follower,
    sourceModel: 'User',
    target: following,
    targetModel: 'User',
    type: NotificationType.NEW_FOLLOWER,
    userId: following,
  }, {
    upsert: true,
  });
}

export async function createNewReviewOnYourLevelNotification(levelUserId: string | ObjectId, sourceUserId: string | ObjectId, targetLevelId: string | ObjectId, message: string | ObjectId) {
  return await NotificationModel.updateOne({
    source: sourceUserId,
    sourceModel: 'User',
    target: targetLevelId,
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    userId: levelUserId,
  }, {
    message: message,
    source: sourceUserId,
    sourceModel: 'User',
    target: targetLevelId,
    targetModel: 'Level',
    type: NotificationType.NEW_REVIEW_ON_YOUR_LEVEL,
    userId: levelUserId,
  }, {
    upsert: true,
  });
}

export async function createNewLevelNotifications(userIdWhoCreatedLevel: ObjectId, targetLevelId: ObjectId, message?: string | ObjectId) {
  const usersThatFollow = await GraphModel.find({
    target: userIdWhoCreatedLevel,
    targetModel: 'User',
    type: GraphType.FOLLOW,
  }, 'source', {
    lean: true,
  }).populate('source', '_id');

  const createRecords = usersThatFollow.map(user => {
    return {
      message: message,
      source: userIdWhoCreatedLevel,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      type: NotificationType.NEW_LEVEL,
      userId: user.source._id,
    };
  });

  return await NotificationModel.create(createRecords);
}

export async function createNewRecordOnALevelYouBeatNotification(userIds: string[] | ObjectId[], userIdWhoSetNewRecord: string | ObjectId, targetLevelId: string | ObjectId, message?: string | ObjectId) {
  const createRecords = userIds.map(userId => {
    return {
      message: message,
      source: userIdWhoSetNewRecord,
      sourceModel: 'User',
      target: targetLevelId,
      targetModel: 'Level',
      type: NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT,
      userId: userId,
    };
  });

  return await NotificationModel.create(createRecords);
}

export async function clearNotifications(userId?: string | ObjectId, sourceId?: string | ObjectId, targetId?: string | ObjectId, type?: NotificationType ) {
  const obj: {userId?: string | ObjectId, target?: string | ObjectId, source?: string | ObjectId, type?: NotificationType} = {};

  if (userId) {
    obj['userId'] = userId;
  }

  if (targetId) {
    obj['target'] = targetId;
  }

  if (sourceId) {
    obj['source'] = sourceId;
  }

  if (type) {
    obj['type'] = type;
  }

  return await NotificationModel.deleteMany({
    ...obj,
  });
}
