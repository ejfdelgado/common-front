import { SearchLangsType } from "@services/alterego.service";
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
    top: number;
    distance: number;
    language: SearchLangsType;
    instruct: string;
    knowledge_path?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
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

export const DEF_ASSISTANT_MODEL = {
    title: '',
    description: '',
    language: 'en',
    top: 3,
    distance: 0.3,
    instruct: "You are an assistant giving some information",
};