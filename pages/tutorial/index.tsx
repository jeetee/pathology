/* istanbul ignore file */

import { createPopper, Instance, Placement } from '@popperjs/core';
import { ObjectId } from 'bson';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Controls from '../../components/level/controls';
import styles from '../../components/level/Controls.module.css';
import EditorLayout from '../../components/level/editorLayout';
import Game, { GameState } from '../../components/level/game';
import Page from '../../components/page';
import LevelDataType from '../../constants/levelDataType';
import { TimerUtil } from '../../helpers/getTs';
import useUser from '../../hooks/useUser';
import useUserConfig from '../../hooks/useUserConfig';
import useWindowSize from '../../hooks/useWindowSize';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Position, { getDirectionFromCode } from '../../models/position';

interface Tooltip {
  canClose?: boolean;
  dir?: Placement;
  target: string;
  title: JSX.Element;
}

interface TutorialStep {
  editorGrid?: boolean;
  gameClasses?: string;
  gameGrid?: boolean;
  header: JSX.Element;
  isNextButtonDisabled?: boolean;
  key?: string;
  level?: Level;
  onComplete?: () => void;
  onMove?: (gameState: GameState) => void;
  // number of steps back using the previous button
  prevSteps?: number;
  tooltip?: Tooltip;
}

export default function App() {
  function getLevel(data: string, override: Partial<Level> = {}): Level {
    const sp = data.split('\n');
    const width = sp[0].length;

    return {
      _id: new ObjectId(),
      authorNote: 'test level 1 author note',
      data: data,
      height: sp.length,
      isDraft: false,
      leastMoves: 0,
      name: 'test level 1',
      ts: TimerUtil.getTs(),
      width: width,
      ...override,
    } as Level;
  }

  const globalTimeout = useRef<NodeJS.Timeout | null>(null);
  const [header, setHeader] = useState(<>Please wait...</>);
  const [isNextButtonDisabled, setIsNextButtonDisabled] = useState(false);
  const [isPrevButtonDisabled, setIsPrevButtonDisabled] = useState(false);
  const { mutateUserConfig } = useUserConfig();
  const [popperInstance, setPopperInstance] = useState<Instance | null>(null);
  const popperUpdateInterval = useRef<NodeJS.Timer | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>();
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialStepIndexMax, setTutorialStepIndexMax] = useState(0);
  const { user } = useUser();
  const windowSize = useWindowSize();

  const BLANK_GRID = '0000000\n0000000\n0000000\n0000000\n0000000';
  const GRID_WITH_PLAYER = '0000000\n0000000\n0004000\n0000000\n0000000';
  const LEVEL_1_ONLY_END = '000000\n000000\n000000\n000030\n000000';
  const LEVEL_1 = '000000\n040000\n000000\n000030\n000000';
  const WALL_INTRO = '00000\n00100\n40100\n00103\n00000';
  const MULTIPLE_ENDS = '0000100\n0400000\n0001003\n0000000\n0100030\n0000000\n0303000';
  const MOVABLE_INTRO = '400\n000\n120\n000\n300';
  const MOVABLE_EXPLAIN = '410100\n002200\n010103\n000110';
  const MOVABLE_EXPLAIN_END_COVER = '00100\n04232\n01010\n00000';
  const RESTRICTED_MOVABLES = '00000\n060E0\n00000\n0D0I0\n00000';
  const RESTRICTED_MOVABLES_EXPLAIN = '4010010\n070C000\n0010013';
  const HOLES_EXPLAIN = '000010\n000053\n000010\n000011';
  const HOLES_INTRO = '000010\n080053\n000010\n004011';

  useEffect(() => {
    const sessionStorageTutorialStep = sessionStorage.getItem('tutorialStep');

    if (sessionStorageTutorialStep) {
      setTutorialStepIndex(parseInt(sessionStorageTutorialStep));
    }
  }, []);

  useEffect(() => {
    if (tutorialStepIndex > tutorialStepIndexMax) {
      setTutorialStepIndexMax(tutorialStepIndex);
    }

    sessionStorage.setItem('tutorialStep', tutorialStepIndex.toString());
  }, [tutorialStepIndex, tutorialStepIndexMax]);

  const initializeTooltip = useCallback((tooltip: Tooltip | undefined) => {
    setTooltip(tooltip);

    if (tooltip) {
      // set opacity of tooltip to 0
      const tooltipEl = document.getElementById('tooltip');

      if (tooltipEl) {
        tooltipEl.style.opacity = '0';
      }

      // loop every 1ms until DOM has loeaded, then show the tooltip
      const popperI = setInterval(() => {
        if (!tooltip) {
          return;
        }

        const tooltipEl = document.getElementById('tooltip');

        if (!tooltipEl) {
          return;
        }

        const target = document.querySelector(tooltip.target);
        // get y position of target
        const targetY = target?.getBoundingClientRect().top;

        if (!targetY) {
          tooltipEl.style.opacity = '0';

          return;
        }

        tooltipEl.style.opacity = '0.9';

        const instance = createPopper(target, tooltipEl, {
          placement: tooltip.dir || 'top',
          modifiers: [
            {
              name: 'flip',
              options: {
                boundary: document.querySelector('#tutorial-container'),
                fallbackPlacements: ['bottom'],
              },
            },
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
          ]
        });

        clearInterval(popperI);
        setPopperInstance(instance);
      }, 1);
    } else {
      setPopperInstance(null);
    }
  }, []);

  const niceJob = useCallback(() => {
    setTooltip(undefined);
    setPopperInstance(null);
    setHeader(<div className='text-3xl p-6 glow'>Nice job!</div>);

    const gameDivParent = document.getElementById('game-div-parent');

    // remove fadeIn class if it exists and add fadeOut
    if (gameDivParent) {
      gameDivParent.classList.remove('fadeIn');
      gameDivParent.classList.add('fadeOut');
    }

    setIsNextButtonDisabled(true);
    setIsPrevButtonDisabled(true);

    if (globalTimeout.current) {
      clearTimeout(globalTimeout.current);
    }

    globalTimeout.current = setTimeout(() => {
      setTutorialStepIndex(i => i + 1);
    }, 1500);
  }, []);

  const prevControl = useCallback((disabled = false) => new Control(
    'control-prev',
    () => setTutorialStepIndex(i => i - 1),
    <div className='flex justify-center'>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-left-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z' />
      </svg>
      <span className='pr-2'>
        Prev
      </span>
    </div>,
    disabled,
    !disabled,
  ), []);

  const nextControl = useCallback((disabled = false) => new Control(
    'control-next',
    () => setTutorialStepIndex(i => i + 1),
    <div className='flex justify-center'>
      <span className='pl-2'>
        Next
      </span>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-right-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
      </svg>
    </div>,
    disabled,
    !disabled,
  ), []);

  const getTutorialSteps = useCallback(() => {
    return [
      {
        hasNext: true,
        header: <>
          <div className='text-3xl p-6 fadeIn'>Welcome to the Pathology tutorial!</div>
          <div className='text-xl fadeIn' style={{
            animationDelay: '1s',
          }}>In this tutorial you will be walked through the basics of the game.</div>
        </>,
      },
      {
        editorGrid: true,
        gameClasses: 'fadeIn',
        header: <div key='tutorial-blank-grid-header' className='text-3xl p-6 fadeIn'>Pathology is a grid-based puzzle game.</div>,
        key: 'tutorial-blank-grid',
        level: getLevel(BLANK_GRID),
      },
      {
        editorGrid: true,
        header: <div key='tutorial-player-intro-header' className='text-2xl p-6'>That square in the middle is the <span className='font-bold'>Player</span> you will be controlling.</div>,
        key: 'tutorial-player-intro',
        level: getLevel(GRID_WITH_PLAYER),
        tooltip: { target: '.block_type_4', title: <div>Player</div> },
      },
      {
        gameGrid: true,
        header: <div key='tutorial-player-intro-header' className='text-2xl p-6'>Try moving around using the arrow keys (or swipe with mobile).</div>,
        isNextButtonDisabled: true,
        key: 'tutorial-player-intro',
        level: getLevel(GRID_WITH_PLAYER),
        onMove: () => setIsNextButtonDisabled(false),
        tooltip: { canClose: true, target: '#player', title: <div className='flex'>
          {
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) === false ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                xmlnsXlink='http://www.w3.org/1999/xlink'
                width='100'
                height='68'
                version='1'
              >
                <defs>
                  <linearGradient id='shadow'>
                    <stop offset='0' stopColor='#fff' stopOpacity='1'></stop>
                    <stop offset='1' stopColor='#000' stopOpacity='1'></stop>
                  </linearGradient>
                  <linearGradient
                    id='shadow1'
                    x1='50'
                    x2='50'
                    y1='1'
                    y2='15.383'
                    gradientUnits='userSpaceOnUse'
                    spreadMethod='pad'
                    xlinkHref='#shadow'
                  ></linearGradient>
                  <linearGradient
                    id='shadow2'
                    x1='0'
                    x2='15.829'
                    y1='34.283'
                    y2='49.895'
                    gradientUnits='userSpaceOnUse'
                    spreadMethod='pad'
                    xlinkHref='#shadow'
                  ></linearGradient>
                </defs>
                <rect
                  id='up'
                  width='31'
                  height='31'
                  x='34.5'
                  y='1.5'
                  fill='url(#shadow1)'
                  fillOpacity='1'
                  stroke='#000'
                  strokeDasharray='none'
                  strokeDashoffset='0'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeMiterlimit='4'
                  strokeOpacity='1'
                  strokeWidth='1'
                  rx='5.75'
                  ry='5.75'
                ></rect>
                <rect
                  id='left'
                  width='31'
                  height='31'
                  x='1.5'
                  y='34.5'
                  fill='url(#shadow2)'
                  fillOpacity='1'
                  stroke='#000'
                  strokeDasharray='none'
                  strokeDashoffset='0'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeMiterlimit='4'
                  strokeOpacity='1'
                  strokeWidth='1'
                  rx='5.75'
                  ry='5.75'
                ></rect>
                <use
                  width='100'
                  height='66'
                  x='0'
                  y='0'
                  transform='matrix(.99943 0 0 .99942 .028 33.01)'
                  xlinkHref='#up'
                ></use>
                <use
                  width='100'
                  height='66'
                  x='0'
                  y='0'
                  transform='matrix(-1 0 0 1 100 0)'
                  xlinkHref='#left'
                ></use>
                <path
                  id='up_arrow'
                  fill='#fff'
                  fillOpacity='0.5'
                  stroke='none'
                  strokeDasharray='none'
                  strokeDashoffset='0'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeMiterlimit='4'
                  strokeOpacity='1'
                  strokeWidth='1'
                  d='M45.778 9h8.444C58.436 9.445 58 13.5 58 16.655c.074 3.469.587 7.603-3.778 8.345h-8.444C41.453 24.524 42 20.258 42 17.034 41.905 13.63 41.537 9.72 45.778 9zm-1.056 11.708l10.556-.125-5.39-9.07-5.166 9.195z'
                ></path>
                <use
                  width='100'
                  height='66'
                  x='0'
                  y='0'
                  transform='rotate(-90 50.25 50.25)'
                  xlinkHref='#up_arrow'
                ></use>
                <use
                  width='100'
                  height='66'
                  x='0'
                  y='0'
                  transform='matrix(1 0 0 -1 0 67.5)'
                  xlinkHref='#up_arrow'
                ></use>
                <use
                  width='100'
                  height='66'
                  x='0'
                  y='0'
                  transform='rotate(90 49.75 50.25)'
                  xlinkHref='#up_arrow'
                ></use>
              </svg>
            ) : (
              <div>Swipe or tap on a neighboring square</div>
            )}
        </div>
        },
      },
      {
        editorGrid: true,
        gameClasses: 'fadeIn',
        header: <>
          <div className='text-3xl p-6'>This is an exit.</div>
          <div className='text-xl'>Your goal is to reach it in the specified number of moves.</div>
        </>,
        key: 'tutorial-level-1-only-end',
        level: getLevel(LEVEL_1_ONLY_END, { leastMoves: 5 }),
        tooltip: { target: '.block_type_3', title: <div>Exit</div>, dir: 'top' },
      },
      {
        gameGrid: true,
        header: <div key='tutorial-level-1-header' className='text-3xl p-6 fadeIn'>Try completing your first level!</div>,
        key: 'tutorial-level-1',
        level: getLevel(LEVEL_1, { leastMoves: 5 }),
        onComplete: niceJob,
        onMove: (gameState: GameState) => {
          const undoButton = document.getElementById('btn-undo') as HTMLButtonElement;

          // NB: advanced undo notification for the very first level
          // notify the user to undo if they have gone past the exit (too far right or down)
          // or if they have gone left or up at any point
          if (gameState.pos.x > 4 || gameState.pos.y > 3 || gameState.moves.some(move => {
            const direction = getDirectionFromCode(move.code);

            return direction?.equals(new Position(-1, 0)) || direction?.equals(new Position(0, -1));
          })) {
            undoButton?.classList.add(styles['highlight-red']);
          } else {
            undoButton?.classList.remove(styles['highlight-red']);
          }
        },
        tooltip: { canClose: true, target: '.block_type_3', title: <div>Move the Player here in 5 moves</div>, dir: 'bottom' },
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-wall-header' className='text-3xl p-6 fadeIn'>Try getting to the exit now.</div>,
        key: 'tutorial-wall',
        level: getLevel(WALL_INTRO, { leastMoves: 7 }),
        onComplete: niceJob,
        tooltip: { canClose: true, target: '.block_type_1', title: <div>You are not able to go through walls</div> },
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-ends-header' className='text-3xl p-6 fadeIn'>There can be multiple exits.</div>,
        key: 'tutorial-ends',
        level: getLevel(MULTIPLE_ENDS, { leastMoves: 6 }),
        onComplete: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-movable-header' className='text-3xl p-6 fadeIn'>Blocks with borders can be pushed by the player.</div>,
        key: 'tutorial-movable',
        level: getLevel(MOVABLE_INTRO, { leastMoves: 6 }),
        onComplete: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-movable-explain-header' className='text-3xl p-6 fadeIn'>You can only push one block at a time.</div>,
        key: 'tutorial-movable-explain',
        level: getLevel(MOVABLE_EXPLAIN, { leastMoves: 11 }),
        onComplete: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div className='text-3xl p-6'>Blocks can cover exits.</div>,
        key: 'tutorial-movable-explain-end-cover',
        level: getLevel(MOVABLE_EXPLAIN_END_COVER, { leastMoves: 8 }),
        onComplete: niceJob,
      },
      {
        editorGrid: true,
        gameClasses: 'fadeIn',
        header: <div key='tutorial-restricted-movables-header' className='text-3xl p-6 fadeIn'>Blocks can only be pushed <span className='underline'>from sides with borders.</span></div>,
        key: 'tutorial-restricted-movables',
        level: getLevel(RESTRICTED_MOVABLES),
        tooltip: { canClose: true, target: '.block_type_D', title: <div>Can only be pushed down and to the left</div>, dir: 'bottom' },
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-restricted-movables-explain-header' className='text-3xl p-6 fadeIn'>Find the path through these restricted blocks!</div>,
        key: 'tutorial-restricted-movables-explain',
        level: getLevel(RESTRICTED_MOVABLES_EXPLAIN, { leastMoves: 12 }),
        onComplete: niceJob,
      },
      {
        editorGrid: true,
        gameClasses: 'fadeIn',
        header: <div key='tutorial-holes-explain-header' className='fadeIn'>
          <div className='text-3xl p-6'>Lastly, this is a hole.</div>
          <div className='text-xl'>Holes can be filled with any block to create a bridge.</div>
        </div>,
        key: 'tutorial-holes-explain',
        level: getLevel(HOLES_EXPLAIN, { leastMoves: 9 }),
        tooltip: { target: '.square-hole', title: <div>Hole</div> },
      },
      {
        gameGrid: true,
        header: <div key='tutorial-holes-intro' className='text-3xl p-6 fadeIn'>Use this block to cross over the hole!</div>,
        key: 'tutorial-holes-intro',
        level: getLevel(HOLES_INTRO, { leastMoves: 9 }),
        onComplete: niceJob,
      },
      {
        header: <div>
          <div className='text-3xl p-6 fadeIn'>Congratulations on completing the tutorial!</div>
          <div className='text-xl pb-6 fadeIn' style={{
            animationDelay: '1s',
          }}>There is a lot more to Pathology than just this:<br />An active community, level editor, and thousands of levels to explore.</div>
          {user ?
            <div className='text-xl fadeIn' style={{
              pointerEvents: 'all',
              animationDelay: '2s' }}>
              Continue your Pathology journey with the <span className='font-bold'>Campaign</span>!
            </div>
            :
            <div className='text-xl fadeIn' style={{
              pointerEvents: 'all',
              animationDelay: '2s'
            }}>
              Now <span className='font-bold'>sign up</span> to explore the world of Pathology!
            </div>
          }
        </div>,
      },
    ] as TutorialStep[];
  }, [niceJob, user]);

  useEffect(() => {
    if (popperUpdateInterval.current) {
      clearInterval(popperUpdateInterval.current);
    }

    if (!popperInstance) {
      return;
    }

    popperUpdateInterval.current = setInterval(async () => {
      if (popperInstance) {
        popperInstance.forceUpdate();
      }
    }, 10);
  }, [popperInstance]);

  const putTutorialCompletedAt = useCallback((tutorialCompletedAt: number) => {
    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        tutorialCompletedAt: tutorialCompletedAt,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(() => {
      mutateUserConfig();
    }).catch(err => {
      console.error('Error setting tutorialCompletedAt', err);
    });
  }, [mutateUserConfig]);

  useEffect(() => {
    setTooltip(undefined);
    setPopperInstance(null);

    const tutorialSteps = getTutorialSteps();
    const tutorialStep = tutorialSteps[tutorialStepIndex];

    setHeader(tutorialStep.header);
    setIsNextButtonDisabled(!!tutorialStep.isNextButtonDisabled);
    setIsPrevButtonDisabled(false);
    initializeTooltip(tutorialStep.tooltip);

    // mark tutorial as completed on the last step
    if (tutorialSteps.length - 1 === tutorialStepIndex) {
      if (user) {
        putTutorialCompletedAt(TimerUtil.getTs());
        window.localStorage.removeItem('tutorialCompletedAt');
      } else {
        localStorage.setItem('tutorialCompletedAt', '' + TimerUtil.getTs());
      }
    }
  }, [getTutorialSteps, initializeTooltip, putTutorialCompletedAt, tutorialStepIndex, user]);

  if (!windowSize) {
    return null;
  }

  const tutorialStep = getTutorialSteps()[tutorialStepIndex];
  const controls: Control[] = [];

  if (tutorialStepIndex !== 0) {
    controls.push(prevControl(isPrevButtonDisabled));
  }

  if (tutorialStepIndex !== getTutorialSteps().length - 1) {
    controls.push(nextControl(isNextButtonDisabled || (!tutorialStep.isNextButtonDisabled && tutorialStep.gameGrid && tutorialStepIndex === tutorialStepIndexMax)));
  } else {
    controls.push(new Control(
      'restart',
      () => {return;},
      <button onClick={() => setTutorialStepIndex(0)}>Restart</button>,
      false,
      true,
    ));

    controls.push(user ?
      new Control(
        'control-campaign',
        () => {return;},
        <Link href='/campaign/pathology'>Campaign</Link>,
        false,
        true,
      )
      :
      new Control(
        'control-sign-up',
        () => {return;},
        <Link href='/signup'>Sign up</Link>,
        false,
        true,
      )
    );
  }

  return (
    <Page isFullScreen={tutorialStep.editorGrid || tutorialStep.gameGrid} title={'Pathology'}>
      <div className='flex flex-col h-full' id='tutorial-container'>
        <div className='w-full bg-gray-200 h-1 mb-1'>
          <div className='bg-blue-600 h-1' style={{
            width: (100 * tutorialStepIndex / (getTutorialSteps().length - 1)) + '%',
            transition: 'width 0.5s ease'
          }} />
        </div>
        {tutorialStep.editorGrid && tutorialStep.level && (
          <EditorLayout
            controls={controls}
            key={tutorialStep.key}
            level={tutorialStep.level}
          />
        )}
        {tutorialStep.gameGrid && tutorialStep.level && (
          <div id='game-div-parent' key={'div-' + tutorialStep.key} className={classNames('grow', tutorialStep.gameClasses)}>
            <Game
              disableServer={true}
              extraControls={controls}
              key={tutorialStep.key}
              level={tutorialStep.level}
              onComplete={tutorialStep.onComplete}
              onMove={(gameState: GameState) => {
                const restartButton = document.getElementById('btn-restart') as HTMLButtonElement;

                // show restart notification if they have reached the exit in too many moves
                if (gameState.board[gameState.pos.y][gameState.pos.x].levelDataType === LevelDataType.End && gameState.moveCount > (tutorialStep.level?.leastMoves ?? 0)) {
                  restartButton?.classList.add(styles['highlight-red']);
                } else {
                  restartButton?.classList.remove(styles['highlight-red']);
                }

                if (tutorialStep.key !== 'tutorial-player-intro') {
                  const undoButton = document.getElementById('btn-undo') as HTMLButtonElement;

                  // show undo notification if they have made too many moves
                  if (gameState.moveCount > (tutorialStep.level?.leastMoves ?? 0)) {
                    undoButton?.classList.add(styles['highlight-red']);
                  } else {
                    undoButton?.classList.remove(styles['highlight-red']);
                  }
                }

                if (tutorialStep.onMove) {
                  tutorialStep.onMove(gameState);
                }
              }}
            />
          </div>
        )}
        <div className='p-2 w-full text-center' style={{
          height: 200,
        }}>
          {header}
          {!tutorialStep.editorGrid && !tutorialStep.gameGrid &&
            <div className='p-6'>
              <Controls controls={controls} />
            </div>
          }
        </div>
        {tooltip ?
          <div
            key={'tooltip-' + tutorialStepIndex} className='bg-white rounded-lg text-black p-3 font-bold justify-center opacity-90 flex fadeIn' id='tooltip' role='tooltip' style={{
              zIndex: 10,
              animationDelay: '0.5s',
            }}
          >
            {tooltip.title}
            {tooltip.canClose &&
              <svg className='h-3 w-3 my-1.5 ml-2 cursor-pointer' fill={'var(--bg-color-4)'} version='1.1' id='Capa_1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 460.775 460.775' xmlSpace='preserve' onClick={() => setTooltip(undefined)}>
                <path d='M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
                c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
                c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
                c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
                l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
                c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z' />
              </svg>
            }
            <div id='arrow' data-popper-arrow></div>
          </div>
          :
          <div id='tooltip'></div>
        }
      </div>
    </Page>
  );
}
