export interface MenuOptionType {
  label: string;
  translateFolder?: string;
  icon?: string;
  isPlainIcon?: boolean;
  callback?: Function;
  children?: MenuOptionType[];
  opened?: boolean;
  visible?: boolean;
  roles?: string[];
  name?: string;
  inUse?: boolean;
  metaId?: string;
}

export interface StatusBarConfigType {
  hamburgerHighlight?: boolean;
}

export interface MenuConfigType {}
