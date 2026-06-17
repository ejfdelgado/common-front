
export function removeEmojis(text: string) {
    return text.replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}/gu, '');
}