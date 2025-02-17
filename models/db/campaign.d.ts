import { Types } from 'mongoose';
import Collection, { EnrichedCollection } from './collection';

// represents a document from the pathology.campaigns collection
interface Campaign {
  _id: Types.ObjectId;
  authorNote?: string;
  collections: Types.Array<Types.ObjectId & Collection> | EnrichedCollection[];
  name: string;
  slug: string;
}

export interface EnrichedCampaign extends Campaign {
  levelCount: number;
  userCompletedCount: number;
}

export default Campaign;
