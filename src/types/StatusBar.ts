
export interface MenuOptionType {
    label: string;
    translateFolder?: string;
    icon?: string;
    isPlainIcon?: boolean;
    callback?: Function,
    children?: MenuOptionType[];
    opened?: boolean;
    visible?: boolean;
    name?: string;
    inUse?: boolean;
}

export interface StatusBarConfigType {
    hamburgerHighlight?: boolean;
}


export interface MenuConfigType {

}