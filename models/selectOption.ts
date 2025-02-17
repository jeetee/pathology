import { EnrichedLevel } from './db/level';
import SelectOptionStats from './selectOptionStats';

interface SelectOption {
  author?: string | undefined;
  disabled?: boolean;
  height?: number;
  href?: string;
  id: string;
  level?: EnrichedLevel | undefined;
  onClick?: () => void;
  stats?: SelectOptionStats | undefined;
  text: string;
}

export default SelectOption;
