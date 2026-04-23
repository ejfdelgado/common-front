declare module 'wordcloud' {
    export default function WordCloud(
        element: HTMLElement,
        options: WordCloud.Options
    ): void;

    namespace WordCloud {
        interface Options {
            list: [string, number][];
            gridSize?: number;
            weightFactor?: number;
            fontFamily?: string;
            color?: string | ((word: string, weight: number) => string);
            backgroundColor?: string;
            rotateRatio?: number;
            rotationSteps?: number;
        }
    }
}