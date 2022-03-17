import Color from '../../constants/color';
import React from 'react';
import Universe from '../../models/data/psychopath/universe';

interface UniverseSelectProps {
  setUniverseId: (universeId: string | undefined) => void;
  universes: Universe[];
}

export default function UniverseSelect({ setUniverseId, universes }: UniverseSelectProps) {
  const buttons = [];

  for (let i = 0; i < universes.length; i++) {
    const universe = universes[i];
    const color = universe.inPathology ? 'rgb(0 200 0)' : 'white';

    buttons.push(
      <button
        key={i} className={'border-2'}
        onClick={() => setUniverseId(universe._id)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
          borderColor: color,
          color: color,
        }}>
        {universe.name}
        <br/>
        <span className={'text-xs'}>{universe.email}</span>
        <br/>
        {universe.psychopathId}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
