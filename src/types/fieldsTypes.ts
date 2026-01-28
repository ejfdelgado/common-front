

export interface TemplateDetailDataType {
    template: string;
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
    "phone" |
    "image-gallery"
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

export interface ContentEditableDetailDataType {
    maxHeight?: number;
    minHeight?: number;
}

// Image Gallery

export interface ImageGalleryDataType extends FieldDataType {
    gallery: ImageGalleryConfigDataType;
}

export interface ImageGalleryConfigDataType extends ImageDetailDataType {

}

export type ImageGalleryType = {
    image: string,
    description: string,
};

// JSON

export interface FieldJSONDataType extends FieldDataType {
    json: JSONDetailDataType;
}

export type AllFieldsDataType =
    FieldDataType |
    FieldImageDataType |
    FieldJSONDataType |
    ChipDataType |
    ContenteditableDataType |
    ImageGalleryDataType;

export interface JSONDetailDataType extends TemplateDetailDataType {
    fields: (
        FieldDataType |
        FieldImageDataType |
        FieldJSONDataType |
        ChipDataType |
        ContenteditableDataType |
        ImageGalleryDataType
    )[],
}