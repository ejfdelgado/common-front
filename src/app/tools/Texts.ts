export function removeAccents(text: string): string {
    return text
        .normalize('NFD')                 // Separates characters from their accents
        .replace(/[\u0300-\u036f]/g, ''); // Removes the accent marks (combining marks)
};

export function normalizeName(name: string) {
    return removeAccents(name.toLowerCase()).replace(/^[a-z]/g, "_");
}