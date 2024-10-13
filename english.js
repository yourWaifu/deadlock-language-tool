import {translateFile, saveCache} from "./core.js";

// for testing to ensure everything works

let englishLangConfig = {
    "translatorFormat": "HTML",
    "name": "english",
    "translate": (textToTranslate) => textToTranslate,
};

function createConfig() {
    return englishLangConfig;
}

let everyTask = Promise.all([
    translateFile('./resources/citadel_attributes/citadel_attributes_english.txt', createConfig()),
    translateFile('./resources/citadel_gc/citadel_gc_english.txt', createConfig()),
    translateFile('./resources/citadel_heroes/citadel_heroes_english.txt', createConfig()),
    translateFile('./resources/citadel_main/citadel_main_english.txt', createConfig()),
    translateFile('./resources/citadel_mods/citadel_mods_english.txt', createConfig()),
]);

saveCache(everyTask);