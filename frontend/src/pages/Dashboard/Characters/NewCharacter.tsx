import React, { useState } from 'react';
import GameSystemPicker from './Components/GameSystemPicker';
import Dnd5eCharacterWizard from './creation/Dnd5eCharacterWizard';

const NewCharacter = () => {
  const [game, setGame] = useState<string | null>(null);

  if (game === 'dnd_5e') {
    return <Dnd5eCharacterWizard onBack={() => setGame(null)} />;
  }

  return <GameSystemPicker onSelect={setGame} />;
};

export default NewCharacter;
