import toShavian from "to-shavian";
import {translateFile, saveCache} from "./core.js";

let shavianLangConfig = {
    "translatorFormat": "separated",
    "name": "shavian",
    "translate": (textToTranslate) => toShavian(textToTranslate),
};

function createConfig() {
    return shavianLangConfig
}

let everyTask = Promise.all([
    translateFile('./resources/citadel_attributes/citadel_attributes_english.txt', createConfig()),
    translateFile('./resources/citadel_gc/citadel_gc_english.txt', createConfig()),
    translateFile('./resources/citadel_heroes/citadel_heroes_english.txt', createConfig()),
    translateFile('./resources/citadel_main/citadel_main_english.txt', createConfig()),
    translateFile('./resources/citadel_mods/citadel_mods_english.txt', createConfig()),
]);

saveCache(everyTask);