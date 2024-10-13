import {TranslationServiceClient} from '@google-cloud/translate';
import {translateFile, saveCache} from "./core.js";

const projectId = 'ai-language-translation';
const location = 'global';
const languageCode = "yue";
const languageName = "cantoese";

const translationClient = new TranslationServiceClient();

// TSV stands for tabs separated value
async function translateTSV(tsv) {
    // upload to google
    // batch translate
}

async function translateSingle(text) {
    if (1024 < text.length) {
        console.log("text is too long for translate single, use translate TSV");
        throw new Error("text is too long");
    }

    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/html', // mime types: text/plain, text/html
        sourceLanguageCode: 'en',
        targetLanguageCode: languageCode,
    };

    const [response] = await translationClient.translateText(request);
    return response.translations[0].translatedText;
}

function createConfig(){
    let textTotalCount = 0;
    let textArrivedCount = 0;
    let promiseMap = new Map();
    let tsv = [];
    let largestTextLength = 0;
    let onAllText = () => {
        textArrivedCount += 1;
        if (textArrivedCount === textTotalCount) {
            
        }
    }
    return {
        "translatorFormat": "HTML",
        "name": languageName,
        "onParsedFile": (fileAsMap) => {
            textTotalCount = fileAsMap.size;
        },
        "onText": (id) => {
            if (!promiseMap.has(id)) {
                onAllText();
            }
        },
        "translate": (textToTranslate, id) => {
            // TSV translate
            /*return new Promise((resolve, reject) => {
                tsv.push(`${id}\t${textToTranslate}\n`);
                promiseMap.set(id, {resolve, reject});
            });*/
            onAllText();
            return translateSingle(textToTranslate);
        },
    };
}

let everyTask = Promise.all([
    translateFile('./resources/citadel_attributes/citadel_attributes_english.txt', createConfig()),
    translateFile('./resources/citadel_gc/citadel_gc_english.txt', createConfig()),
    translateFile('./resources/citadel_heroes/citadel_heroes_english.txt', createConfig()),
    translateFile('./resources/citadel_main/citadel_main_english.txt', createConfig()),
    translateFile('./resources/citadel_mods/citadel_mods_english.txt', createConfig()),
]);

saveCache(everyTask);