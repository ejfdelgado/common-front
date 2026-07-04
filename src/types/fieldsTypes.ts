import { DropDownOptionDataType } from "./ragTypes";


export interface TemplateDetailDataType {
    template: string;
    secret?: boolean;
    pass?: string;
}

export interface FieldDataType {
    type:
    "chip" |
    "text" |
    "number" |
    "select" |
    "textarea" |
    "contenteditable" |
    "md" |
    "toggle" |
    "rating" |
    "image" |
    "json" |
    "json_raw" |
    "phone" |
    "image-gallery" |
    "camera-picker" |
    "mic-picker" |
    "slider"
    ;
    label: string;
    key: string;
    required?: boolean;
};

// Image

export interface FieldImageDataType extends FieldDataType {
    image: ImageDetailDataType;
}

export interface ImageDetailDataType extends TemplateDetailDataType {
    withThumbnail?: boolean;
    maxSizePixels?: number;
    thumbnailMaxSizePixels?: number;
    squareMaxSizePixels?: number;
}

// Chip

export interface ChipDataType extends FieldDataType {
    chip: ChipDetailDataType;
}

export interface ChipDetailDataType {
    stringOptions: string[];
}

// Content editable

export interface ContenteditableDataType extends FieldDataType {
    contenteditable: ContentEditableDetailDataType;
}

export interface ContentEditableDetailConfigDataType {
    useBold: boolean;
    useItalic: boolean;
    useUnderline: boolean;
    useEmoji: boolean;
}

export interface ContentEditableDetailDataType {
    maxHeight?: string;
    minHeight?: string;
    configs?: ContentEditableDetailConfigDataType;
}

// MD

export interface MDDataType extends FieldDataType {
    md: MDDetailDataType;
}

export interface MDDetailDataType {
    maxHeight?: string;
    minHeight?: string;
    saveName?: string;
}

// Image Gallery

export interface ImageGalleryDataType extends FieldDataType {
    gallery: ImageGalleryConfigDataType;
}

export interface ImageGalleryConfigDataType extends ImageDetailDataType {

}

export type ImageGalleryType = {
    id: string,
    image: string,
    description: string,
};

// JSON

export interface FieldJSONDataType extends FieldDataType {
    json: JSONDetailDataType;
}

export interface FieldJSONRawDataType extends FieldDataType {

}

// Toggle

export interface FieldToggleDataType extends FieldDataType {
    toggle: FieldToggleDetailDataType;
}

export interface FieldToggleDetailDataType {
    iconName: string;
}

// Select

export interface FieldSelectDataType extends FieldDataType {
    select: FieldSelectDetailDataType;
}

export interface FieldSelectDetailDataType {
    options: DropDownOptionDataType[]
}

// Finish

export type AllFieldsDataType =
    FieldDataType |
    FieldImageDataType |
    FieldJSONDataType |
    FieldJSONRawDataType |
    ChipDataType |
    ContenteditableDataType |
    MDDataType |
    ImageGalleryDataType |
    FieldToggleDataType |
    FieldSelectDataType |
    SliderDataType
    ;

export interface JSONDetailDataType extends TemplateDetailDataType {
    fields: (
        FieldDataType |
        FieldImageDataType |
        FieldJSONDataType |
        FieldJSONRawDataType |
        ChipDataType |
        ContenteditableDataType |
        MDDataType |
        ImageGalleryDataType |
        FieldToggleDataType |
        FieldSelectDataType |
        SliderDataType
    )[],
}

export interface SliderDetailDataType {
    min: number;
    max: number;
}

export interface SliderDataType extends FieldDataType {
    slider: SliderDetailDataType;
}