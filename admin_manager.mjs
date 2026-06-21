import fs from "fs";

export class AdminManager {
    static copyVersion() {
        // Read package.json
        const packageContent = JSON.parse(fs.readFileSync("package.json", { encoding: "utf-8" }));
        const currentVersion = packageContent.version;
        console.log(`Placing version ${currentVersion}`);
        // Read ./src/app/app.config.ts
        const modulePath = "./src/app/app.config.ts";
        let appModuleContent = fs.readFileSync(modulePath, { encoding: "utf-8" });
        appModuleContent = appModuleContent.replace(/{\s*['"]?provide['"]?\s*:\s*['"]?appVersion['"]?\s*,\s*['"]?useValue['"]?\s*:\s*['"]?[\d.]+['"]?\s*}/ig, `{ provide: 'appVersion', useValue: '${currentVersion}' }`);
        fs.writeFileSync(modulePath, appModuleContent, { encoding: "utf-8" });
    }

    static execute() {
        const [, , arg1, arg2] = process.argv;
        if (arg1 == "copyVersion") {
            AdminManager.copyVersion();
        }
    }
}

AdminManager.execute();