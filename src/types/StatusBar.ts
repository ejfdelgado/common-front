
export interface MenuOptionType {
    label: string;
    icon?: string;
    isPlainIcon?: boolean;
    callback?: Function,
    children?: MenuOptionType[];
    opened?: boolean;
    visible?: boolean;
    name?: string;
}

export interface StatusBarConfigType {
    hamburgerHighlight?: boolean;
}


export interface MenuConfigType {

}