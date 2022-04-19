import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Pack from '../../models/db/pack';
import { PackModel } from '../../models/mongoose';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useStats from '../../hooks/useStats';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const creators = await UserModel.find<User>({ isCreator: true });

  if (!creators) {
    throw new Error('Error finding Users');
  }

  return {
    paths: creators.map(creator => {
      return {
        params: {
          id: creator._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface CreatorParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as CreatorParams;
  const [creator, packs] = await Promise.all([
    UserModel.findOne<User>({ _id: id, isCreator: true }, 'isOfficial name'),
    PackModel.find<Pack>({ userId: id }, '_id name'),
  ]);

  if (!creator) {
    throw new Error(`Error finding User ${id}`);
  }
  
  if (!packs) {
    throw new Error(`Error finding Pack by userId ${id}`);
  }

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const levels = creator.isOfficial ?
    await LevelModel.find<Level>({ officialUserId: id }, '_id packId') :
    await LevelModel.find<Level>({ userId: id }, '_id packId');

  if (!levels) {
    throw new Error('Error finding Levels by userId');
  }

  const packsToLevelIds: {[packId: string]: Types.ObjectId[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const packId = level.packId.toString();

    if (!(packId in packsToLevelIds)) {
      packsToLevelIds[packId] = [];
    }

    packsToLevelIds[packId].push(level._id);
  }

  return {
    props: {
      creator: JSON.parse(JSON.stringify(creator)),
      packs: JSON.parse(JSON.stringify(packs)),
      packsToLevelIds: JSON.parse(JSON.stringify(packsToLevelIds)),
    } as CreatorPageProps,
  };
}

interface CreatorPageProps {
  creator: User;
  packs: Pack[];
  packsToLevelIds: {[packId: string]: Types.ObjectId[]};
}

export default function CreatorPage({ creator, packs, packsToLevelIds }: CreatorPageProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!packs) {
      return [];
    }

    const packStats = StatsHelper.packStats(packs, packsToLevelIds, stats);

    return packs.map((pack, index) => new SelectOption(
      pack.name,
      `/pack/${pack._id.toString()}`,
      packStats[index],
    )).filter(option => option.stats?.total);
  }, [packs, packsToLevelIds, stats]);

  return (
    <Page
      folders={[new LinkInfo('Catalog', '/catalog')]}
      title={creator?.name}
      titleHref={!creator?.isOfficial ? `/profile/${creator?._id}` : undefined}
    >
      <Select options={getOptions()}/>
    </Page>
  );
}
