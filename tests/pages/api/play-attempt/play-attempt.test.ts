import { ObjectId } from 'bson';
import { enableFetchMocks } from 'jest-fetch-mock';
import { testApiHandler } from 'next-test-api-route-handler';
import { Logger } from 'winston';
import TestId from '../../../../constants/testId';
import { TimerUtil } from '../../../../helpers/getTs';
import { logger } from '../../../../helpers/logger';
import { dbDisconnect } from '../../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../../lib/getTokenCookie';
import { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import PlayAttempt from '../../../../models/db/playAttempt';
import Stat from '../../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel } from '../../../../models/mongoose';
import { calcPlayAttempts } from '../../../../models/schemas/levelSchema';
import { AttemptContext } from '../../../../models/schemas/playAttemptSchema';
import handler from '../../../../pages/api/play-attempt/index';
import statsHandler from '../../../../pages/api/stats/index';

afterAll(async () => {
  await dbDisconnect();
});
afterEach(() => {
  jest.restoreAllMocks();
});
enableFetchMocks();
const MINUTE = 60;

const tests = [
  {
    name: 'play at 5 min for 4 min',
    list: [
      ['play', 5, 'created'],
      ['play', 6, 'updated'],
      ['play', 7, 'updated'],
      ['play', 9, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(4 * MINUTE);
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs.length).toBe(lvl.calc_playattempts_count);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[0].updateCount).toBe(3);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(0);
    }
  },
  {
    name: 'play regular',
    list: [
      ['play', 0, 'created'],
      ['play', 10, 'updated'],
      ['play', 26, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(10 * MINUTE);
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs.length).toBe(lvl.calc_playattempts_count);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[1].updateCount).toBe(1);
    }
  },
  {
    name: 'play at 14m for 5m, come back 5m later and then play for 6m',
    list: [
      ['play', 14, 'created'],
      ['play', 19, 'updated'],
      ['play', 25, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[0].updateCount).toBe(2);
      expect(lvl.calc_playattempts_duration_sum).toBe(11 * MINUTE);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(0);
    }
  },
  {
    name: 'play. dont win. come back and play. win. play a bit. leave. then come back and play',
    list: [
      ['play', 0, 'created'],
      ['play', 1, 'updated'],
      ['play', 2, 'updated'], // total = 2
      ['play', 22, 'created'],
      ['play', 23, 'updated'],
      ['i_make_record', 24, 'ok'], // total = (0-2)+(24-22) = 4
      ['play', 25, 'created'],
      ['play', 26, 'updated'],
      ['play', 50, 'created'],
      ['play', 51, 'updated'],
      ['play', 52, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_count).toBe(2);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(lvl.calc_playattempts_duration_sum).toBe(4 * MINUTE);

      expect(playAttemptDocs.length).toBe(4);
      expect(playAttemptDocs[0].updateCount).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[2].updateCount).toBe(2);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[3].updateCount).toBe(2);
      expect(playAttemptDocs[3].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new ObjectId(TestId.USER)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    name: 'win right away then return 25 minutes later for a moment',
    list: [
      ['play', 0, 'created'],
      ['play', 1, 'updated'],
      ['i_make_record', 1, ''],
      ['play', 25, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(1 * MINUTE );
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[1].updateCount).toBe(2);
    }
  },
  {
    name: 'win right away then continue to play',
    list: [
      ['play', 0, 'created'],
      ['play', 1, 'updated'], // sum = 1
      ['i_make_record', 2, 'ok'], // sum = 1+1 = 2
      ['play', 3, 'created'],
      ['play', 4, 'updated'],
      ['play', 20, 'created'],
      ['play', 21, 'updated'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(lvl.calc_playattempts_duration_sum).toBe(2 * MINUTE);
      expect(playAttemptDocs.length).toBe(3);
      expect(playAttemptDocs[0].updateCount).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[2].updateCount).toBe(2);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  },
  {
    name: 'win right away but then a record comes in way later',
    list: [
      ['play', 0, 'created'],
      ['win_inefficient', 0.1, 'ok'],
      ['other_plays', 99, ''],
      ['other_makes_record', 100, ''],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level,) => {
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[0].userId._id.toString()).toBe(TestId.USER_B);

      expect(playAttemptDocs[1].updateCount).toBe(1);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[1].userId._id.toString()).toBe(TestId.USER);
      expect(lvl.calc_playattempts_unique_users).toStrictEqual([new ObjectId(TestId.USER), new ObjectId(TestId.USER_B)]);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1); // other person won
    }
  },
  {
    name: 'win right away but then a record comes in way later then you match the record',
    list: [
      ['play', 0, 'created'],
      ['win_inefficient', 0.1, 'ok'],
      ['other_makes_record', 1, ''],
      ['play', 2, 'updated'],
      ['i_make_record', 3, ''],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(2);
      expect(playAttemptDocs[0].updateCount).toBe(0);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[1].updateCount).toBe(3);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2);
    }
  },
  {
    name: 'win right away, a record comes in way later, come back and play for a while, give up, then come back and play again and win, then come back a way later and then play',
    list: [
      ['play', 0, 'created'],
      ['play', 5, 'updated'],
      ['play', 35, 'created'],
      ['win_inefficient', 100, 'ok'],
      ['other_makes_record', 200, ''],
      ['play', 250, 'created'],
      ['play', 251, 'updated'],
      ['play', 256, 'updated'],
      ['play', 300, 'created'],
      ['play', 302, 'updated'],
      ['i_make_record', 302.5, ''],
      ['play', 345, 'created'],
      ['clear', 0, '']
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(6);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.BEATEN);
      expect(playAttemptDocs[1].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[2].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[3].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[4].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(playAttemptDocs[5].attemptContext).toBe(AttemptContext.UNBEATEN);
      expect(lvl.calc_playattempts_duration_sum).toBe(4710);
      expect(lvl.calc_playattempts_unique_users).toHaveLength(2);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(2); // both of us beat it
    }
  },
  {
    name: 'win right away but never send a playattempt (unlikely but possible)',
    list: [
      ['win_inefficient', 0.1, 'ok'],
    ],
    tests: async (playAttemptDocs: PlayAttempt[], statDocs: Stat[], lvl: Level) => {
      expect(playAttemptDocs.length).toBe(1);
      expect(playAttemptDocs[0].attemptContext).toBe(AttemptContext.JUST_BEATEN);
      expect(playAttemptDocs[0].startTime).toBe(0.1 * MINUTE);
      expect(playAttemptDocs[0].endTime).toBe(0.1 * MINUTE);
      expect(lvl.calc_playattempts_count).toBe(1);
      expect(lvl.calc_playattempts_duration_sum).toBe(0);
      expect(lvl.calc_playattempts_just_beaten_count).toBe(1);
    }
  }
];

describe('Testing stats api', () => {
  for (const t of tests) {
    for (const [action, timestamp, expected] of t.list) {
      // delete all playattempts
      test(t.name + ' action [' + action + '] at [t=' + timestamp + 'm]', async () => {
        if (action === 'clear') {
          const allAttempts = await PlayAttemptModel.find({}, {}, { sort: { _id: -1 } });
          const allStats = await StatModel.find({}, {}, { sort: { ts: 1 } });
          const lvlBeforeResync = await LevelModel.findByIdAndUpdate(TestId.LEVEL,
            { $set: {
              leastMoves: 10 // normally this is 8, but for these tests make it 10
            } }, { new: true });

          await t.tests(allAttempts, allStats, lvlBeforeResync);

          const resetLvl = await LevelModel.findOneAndUpdate({ _id: TestId.LEVEL }, { $set: { calc_playattempts_just_beaten_count: 0, calc_playattempts_count: 0, calc_playattempts_duration_sum: 0, calc_playattempts_unique_users: [] } }, { new: true });

          expect(resetLvl).toBeDefined();
          expect(resetLvl.calc_playattempts_just_beaten_count).toBe(0);
          expect(resetLvl.calc_playattempts_count).toBe(0);
          expect(resetLvl.calc_playattempts_duration_sum).toBe(0);
          expect(resetLvl.calc_playattempts_unique_users.length).toBe(0);
          await calcPlayAttempts(lvlBeforeResync);
          const lvlAfterResync = await LevelModel.findById(TestId.LEVEL);

          expect(lvlAfterResync.calc_playattempts_just_beaten_count).toBe(lvlBeforeResync.calc_playattempts_just_beaten_count);
          expect(lvlAfterResync.calc_playattempts_count).toBe(lvlBeforeResync.calc_playattempts_count);
          expect(lvlAfterResync.calc_playattempts_duration_sum).toBe(lvlBeforeResync.calc_playattempts_duration_sum);

          expect(lvlAfterResync.calc_playattempts_unique_users.sort()).toStrictEqual(lvlBeforeResync.calc_playattempts_unique_users.sort());
          // Cleanup
          await PlayAttemptModel.deleteMany({});
          await StatModel.deleteMany({});
          await RecordModel.deleteMany({});
          await LevelModel.findOneAndUpdate({ _id: TestId.LEVEL }, { $set: { calc_playattempts_just_beaten_count: 0, calc_playattempts_count: 0, calc_playattempts_duration_sum: 0, calc_playattempts_unique_users: [] } }, { new: true });

          expect(resetLvl).toBeDefined();
          expect(resetLvl.calc_playattempts_just_beaten_count).toBe(0);
          expect(resetLvl.calc_playattempts_count).toBe(0);
          expect(resetLvl.calc_playattempts_duration_sum).toBe(0);
          expect(resetLvl.calc_playattempts_unique_users.length).toBe(0);

          return;
        }

        jest.spyOn(TimerUtil, 'getTs').mockReturnValue(timestamp as number * MINUTE);

        if (action === 'play') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'POST',
                cookies: {
                  token: getTokenCookieValue(TestId.USER),
                },
                body: {
                  levelId: TestId.LEVEL
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await handler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(res.status).toBe(200);
              expect(response.message).toBe(expected);
            },
          });
        } else if (action === 'win_inefficient') {
          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(TestId.USER),
                },
                body: {
                  levelId: TestId.LEVEL,
                  codes: [
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowDown',
                  ],
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await statsHandler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(response.error).toBeUndefined();
            },
          });
        } else if (action === 'i_make_record' || action === 'other_makes_record') {
          const usrId = action === 'i_make_record' ? TestId.USER : TestId.USER_B;

          await testApiHandler({
            handler: async (_, res) => {
              const req: NextApiRequestWithAuth = {
                method: 'PUT',
                cookies: {
                  token: getTokenCookieValue(usrId),
                },
                body: {
                  levelId: TestId.LEVEL,
                  codes: [
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowRight',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowDown',
                  ],
                },
                headers: {
                  'content-type': 'application/json',
                },
              } as unknown as NextApiRequestWithAuth;

              await statsHandler(req, res);
            },
            test: async ({ fetch }) => {
              const res = await fetch();
              const response = await res.json();

              expect(response.error).toBeUndefined();
            },
          });
        }
      });
    }
  }

  test('Wrong HTTP method should fail', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'PATCH',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Method not allowed');
        expect(res.status).toBe(405);
      },
    });
  });
  test('Doing a POST with no body should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with a body but no params should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {

          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Missing required parameters');
        expect(res.status).toBe(400);
      },
    });
  });
  test('Doing a POST with an invalid level should error', async () => {
    await testApiHandler({
      handler: async (_, res) => {
        const req: NextApiRequestWithAuth = {
          method: 'POST',
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
          body: {
            levelId: new ObjectId()
          },
          headers: {
            'content-type': 'application/json',
          },
        } as unknown as NextApiRequestWithAuth;

        await handler(req, res);
      },
      test: async ({ fetch }) => {
        const res = await fetch();
        const response = await res.json();

        expect(response.error).toBe('Level not found');
        expect(res.status).toBe(404);
      },
    });
  });
});
