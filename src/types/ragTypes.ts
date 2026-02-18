import { BasicDataType, SimpleDataType } from "@services/firestore.service";

export interface KnowledgeTagType {
    id: string;
    txt: string;
};

export interface DropDownOptionDataType {
    txt: string;
    val: string;
};

export interface AssistantDataType extends BasicDataType {
    image: string;
}

export interface KnowledgeDataType extends SimpleDataType {
    type: "fact" | "question";
    txt: string;
    txtFormat: string;
    answer?: string;
    answerFormat?: string;
    created: number;
    tags?: KnowledgeTagType[];
};