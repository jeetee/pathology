import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(401).json({
      error: 'Missing required fields',
    });
  }

  // trim whitespaces from name
  const trimmedName = name.trim();
  const user = await UserModel.findOne<User>({ name: trimmedName }, '_id password', { lean: true });

  if (!user || user.password === undefined) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  if (!await bcrypt.compare(password, user.password)) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  const cookie = getTokenCookie(user._id.toString(), req.headers?.host);

  return res.setHeader('Set-Cookie', cookie).status(200).json({ success: true });
});
