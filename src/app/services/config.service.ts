import { Injectable } from '@angular/core';
import { IndicatorService } from './indicator.service';

@Injectable({
    providedIn: 'root',
})
export class ConfigService {

    COOKIE_NAME = 'noglang';
    COOKIE_NAME_LOG = 'loglevel';
    keyPromises: any = {};
    renderer: any;

    constructor(
        private activity: IndicatorService,
    ) {

    }

    setLogLevel(val: string) {
        this.setCookie(this.COOKIE_NAME_LOG, val, 1000);
        this.activity.start();
        window.location.reload();
    }

    getLogLevel() {
        //error warning info
        let currentLogLevel = 'error';
        const urlParams = new URLSearchParams(window.location.search);
        const queryParamLanguage = urlParams.get('loglevel');
        if (queryParamLanguage) {
            currentLogLevel = queryParamLanguage;
            this.setCookie(this.COOKIE_NAME_LOG, currentLogLevel, 1000);
        } else {
            currentLogLevel = this.getCookie(this.COOKIE_NAME_LOG) || 'error';
        }
        return currentLogLevel;
    }

    setLanguage(lang: string, reload: boolean = true) {
        this.setCookie(this.COOKIE_NAME, lang, 1000);
        if (reload) {
            this.activity.start();
            window.location.reload();
        }
    }

    setCookie(cname: string, cvalue: string, exdays: number = 365) {
        const d = new Date();
        d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
        let expires = 'expires=' + d.toUTCString();
        document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
    }

    getCookie(cname: string) {
        let name = cname + '=';
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return '';
    }

    getCurrentLanguage() {
        let currentLang = 'en';
        const urlParams = new URLSearchParams(window.location.search);
        const queryParamLanguage = urlParams.get('l');
        if (queryParamLanguage) {
            currentLang = queryParamLanguage;
            this.setCookie(this.COOKIE_NAME, currentLang, 1000);
        } else {
            currentLang = this.getCookie(this.COOKIE_NAME) || 'en';
        }
        return currentLang;
    }
}