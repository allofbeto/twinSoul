import SlideOver from '../../../../components/SlideOver';
import CharacterDetail from '../../Characters/CharacterDetail';

interface Props {
  characterId: string | null;
  title: string;
  onClose: () => void;
}

// The full character sheet, opened from the initiative tracker. It's read-only
// for a character that isn't the viewer's own (the sheet decides that itself).
export default function CharacterDetailSlideOver({ characterId, title, onClose }: Props) {
  return (
    <SlideOver isOpen={!!characterId} onClose={onClose} title={title} wide>
      {characterId && <CharacterDetail characterId={characterId} />}
    </SlideOver>
  );
}
