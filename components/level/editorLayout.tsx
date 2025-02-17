import React, { useEffect, useRef, useState } from 'react';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Controls from './controls';
import EditorGrid from './editorGrid';

interface EditorLayoutProps {
  controls?: Control[];
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
}

export default function EditorLayout({ controls, level, onClick }: EditorLayoutProps) {
  const [editorLayoutHeight, setEditorLayoutHeight] = useState<number>();
  const editorLayoutRef = useRef<HTMLDivElement>(null);
  const [editorLayoutWidth, setEditorLayoutWidth] = useState<number>();

  useEffect(() => {
    if (editorLayoutRef.current) {
      setEditorLayoutHeight(editorLayoutRef.current.offsetHeight);
      setEditorLayoutWidth(editorLayoutRef.current.offsetWidth);
    }
  }, [
    editorLayoutRef.current?.offsetHeight,
    editorLayoutRef.current?.offsetWidth,
  ]);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const squareSize = !editorLayoutHeight || !editorLayoutWidth ? 0 :
    level.width / level.height > editorLayoutWidth / editorLayoutHeight ?
      Math.floor(editorLayoutWidth / level.width) : Math.floor(editorLayoutHeight / level.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <>
      <div className='grow' id='editor-layout' ref={editorLayoutRef}>
        {/* NB: need a fixed div here so the actual content won't affect the size of the editorLayoutRef */}
        <div className='fixed'>
          <div className='flex flex-col items-center justify-center' style={{
            height: editorLayoutHeight,
            width: editorLayoutWidth,
          }}>
            <EditorGrid
              borderWidth={squareMargin}
              level={level}
              onClick={onClick}
              squareSize={squareSize}
            />
          </div>
        </div>
      </div>
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
