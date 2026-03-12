import { User } from "@angular/fire/auth";
import { BasicDataType, SimpleDataType } from "@services/firestore.service";
import { ImageGalleryType } from "./fieldsTypes";
import { SafeHtml } from "@angular/platform-browser";

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
    useFacts?: boolean;
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
    type: "mail" | "article" | "basic" | "calendar_search" | "calendar_write_guest";
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
    template?: string;
    args: ArgumentDataType[];
    calendarUser?: User | null,
    calendarKeyword?: string;
    calendarMinHoursGap?: number;
    calendarMaxGuests?: number;
    calendarMaxEvents?: number;
    gmailUser?: User | null,
    message?: string | InnerToolResponseType;
    action?: string;
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
    type: "not_found" | "mail";
    checked: boolean;
    reportId: string;//for emails
    searchText?: string;//for not_found
    userQuery?: string;
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
    useFacts: true,
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

export interface MessageLocalDataType {
    date: number;
    role: string;
    txt: SafeHtml;
    gallery?: ImageGalleryType[];
    events?: CalendarEventType[];
};

export interface InnerToolResponseType {
    success: boolean;
    data: any,
    error: null | string;
}

export interface ToolResponseType {
    name: string;
    message: string | InnerToolResponseType;
    hidden?: boolean;
    success?: boolean;
    articles?: ArticleDataType[];
    events?: CalendarEventType[] | null;
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

export interface CalendarEventType {
    "id": string;
    "htmlLink": string;
    "summary": string;
    "start": {
        "dateTime": string;//2026-03-12T14:30:00-05:00
        "timeZone": string;
    };
}