import { BasicDataType } from "@services/firestore.service";

export interface RoomGameType extends BasicDataType {

}

export type GameActionType = "pos" | "mode";

export interface GameAction {
    type: GameActionType,
    data: any;
}