import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Review from '../../../models/db/review';
import { ReviewModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.query) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const { id } = req.query;

  if (!id || !ObjectId.isValid(id as string)) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  await dbConnect();

  const reviews = await ReviewModel.find<Review>({ levelId: id })
    .populate('userId').sort({ ts: -1 });

  if (!reviews) {
    return res.status(404).json({
      error: 'Error finding Reviews',
    });
  }

  reviews.forEach(review => cleanUser(review.userId));

  return res.status(200).json(reviews);
});
