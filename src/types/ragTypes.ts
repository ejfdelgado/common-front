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
    startConversation?: string;
    knowledge_path?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
    whatsapp?: any;
    whatsapp_msg?: string;
    emoji?: string;
    maxHistory: number;
}

export interface KnowledgeDataType extends SimpleDataType {
    type: "fact" | "question";
    txtFormat: string;
    answerFormat?: string;
    created: number;
    tags?: KnowledgeTagType[];
};

export interface FoundKnowledge {
    distance: number;
    metadata: KnowledgeDataType;
};

export interface ArgumentDataType {
    type: string;
    name: string;
    desc: string;
    required: boolean;
    val?: any;//transient data
    modelPath?: string;
    modelIsArray?: boolean;
}
// Tool
export interface ToolDataType extends SimpleDataType {
    type: "mail" | "article";
    name: string;
    desc: string;
    to?: string;
    ok?: string;
    error?: string;
    keywords?: string;
    useInState?: string;
    nextState?: string;
    useStates?: boolean;
    affectModel?: boolean;
    args: ArgumentDataType[];
};
// Article
export interface ArticleDataType extends SimpleDataType {
    keywords: string;
    desc: string;
    gallery?: any;
};

//History
export interface HistoryDataType extends SimpleDataType {
    desc: string;
    checked: boolean;
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
    startConversation: "",
    maxOutputTokens: 10000,
    temperature: 1,
    maxHistory: 30,
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

export interface ToolResponseType {
    name: string;
    message: string;
    success?: boolean;
    articles?: ArticleDataType[];
}

export interface FactCursorDataType {
    createdAt: number;
    id: string;
}

export interface QueryChatType {
    q: string;
    assistantId: string,
    top: number,
    distance: number;
    language: string;
}

export interface AssistantStateType {
    model: any;
    state: string | null;
}