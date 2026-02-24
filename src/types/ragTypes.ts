import { BasicDataType, SimpleDataType } from "@services/firestore.service";

export type SearchLangsType = "en" | "es" | "multi";

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
    whatsapp?: any;
    whatsapp_msg?: string;
}

export interface KnowledgeDataType extends SimpleDataType {
    type: "fact" | "question";
    txtFormat: string;
    answerFormat?: string;
    created: number;
    tags?: KnowledgeTagType[];
};

export interface ArgumentDataType {
    type: string;
    name: string;
    desc: string;
    required: boolean;
    val?: any;//transient data
}
// Tool
export interface ToolDataType extends SimpleDataType {
    type: "mail" | "content";
    name: string;
    desc: string;
    to?: string;
    args: ArgumentDataType[];
};

export interface ToolMatchType {
    name: string;
    args: { [key: string]: any },
};

export const DEF_ASSISTANT_MODEL = {
    title: '',
    description: '',
    language: 'en',
    top: 3,
    distance: 0.3,
    instruct: "You are an assistant giving some information",
    maxOutputTokens: 10000,
    temperature: 1
};

export interface ItemToSearchType {
    id: string;
    title: string;
    url: string;
    distance?: number;
};

export interface SearchAnswerDataType {
    type: string;
    success: boolean;
    payload: ItemToSearchType[];
}
