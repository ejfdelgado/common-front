export function removeAccents(text: string): string {
    return text
        .normalize('NFD')                 // Separates characters from their accents
        .replace(/[\u0300-\u036f]/g, ''); // Removes the accent marks (combining marks)
};