

export interface TemplateDetailDataType {
    template: string;
}

export interface ImageDetailDataType extends TemplateDetailDataType {
    withThumbnail?: boolean;
    maxSizePixels?: number;
    thumbnailMaxSizePixels?: number;
    squareMaxSizePixels?: number;
}

export interface FieldDataType {
    type:
    "chip" |
    "text" |
    "textarea" |
    "contenteditable" |
    "toggle" |
    "rating" |
    "image" |
    "json" |
    "phone"
    ;
    label: string;
    key: string;
    required?: boolean;
};

export interface FieldImageDataType extends FieldDataType {
    image: ImageDetailDataType;
}

export interface FieldJSONDataType extends FieldDataType {
    json: JSONDetailDataType;
}

export interface ChipDetailDataType {
    stringOptions: string[];
}

export interface ContentEditableDetailDataType {
    maxHeight?: number;
    minHeight?: number;
}

export interface ChipDataType extends FieldDataType {
    chip: ChipDetailDataType;
}

export interface ContenteditableDataType extends FieldDataType {
    contenteditable: ContentEditableDetailDataType;
}

export interface ImageGalleryDetailDataType {

}

export type AllFieldsDataType =
    FieldDataType |
    FieldImageDataType |
    FieldJSONDataType |
    ChipDataType |
    ContenteditableDataType;

export interface JSONDetailDataType extends TemplateDetailDataType {
    fields: (
        FieldDataType |
        FieldImageDataType |
        FieldJSONDataType |
        ChipDataType |
        ContenteditableDataType
    )[],
}