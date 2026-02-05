
export interface MenuOptionType {
    label: string;
    icon: string;
    callback: Function,
    children: MenuOptionType[];
}