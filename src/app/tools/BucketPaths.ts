import { IdGen, MyTemplate } from "ejfdelgado-common-ts";

const templateEngine = new MyTemplate();

export function getBucketPath(template: string, url: string, data: any) {
    const params = new URL(`http://temp.com/${url}`).searchParams;
    let versionString = params.get("v");
    let version: number = 0;
    if (versionString != null) {
        version = parseInt(versionString);
    }
    // remove all other query params
    url = url.replace(/\?.*$/, "");
    const original: string[] = [];
    const pattern = template.replaceAll(/(\$\{[^}]+\})/ig, (substring: string, ...args: any[]) => {
        original.push(substring);
        return "([^/]+)";
    });
    const thePattern = new RegExp(pattern, "ig");
    const matches = thePattern.exec(url);
    if (!matches) {
        // No match, then generate new url.
        const now = new Date();
        data.random = IdGen.num2ord(now.getTime());
        data.date = {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
        };
        return templateEngine.render(template, data) + "?v=1";
    } else {
        // match, use old but with version increased
        return `${url}?v=${version + 1}`;
    }
    // voyage_note/edgar.jose.fernando.delgado@gmail.com/2026-1-18/a23d5323ffsd.jpg
}
