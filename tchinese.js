import {TranslationServiceClient} from '@google-cloud/translate';
import {Storage} from "@google-cloud/storage";
import {translateFile, saveCache} from "./core.js";

// google cloud config
const projectId = 'ai-language-translation';

// google storage config
const bucketName = "translator-input";
const storageLocation = "us-east4";

// google translate config
const location = 'global';
const languageCode = "zh-tw";
const languageName = "tchinese";
const doLongText = true;

const translationClient = new TranslationServiceClient();

// includes google's attribution to follow their rules
const googleTranslateAttribution = "𐍍"; // you need the special font to see it
const googleShortAttribution = "𐍌";
let translateAdditionList = new Map([
    ["Citadel_Hud_DebugStats", (text) => `${googleShortAttribution} ${text}`],
    ["Citadel_Dashboard_BuildVersion", (text) => `${text} ${googleTranslateAttribution}`],
]);

const translateSingleLengthLimit = 1024;
async function translateSingle(text, id) {
    if (translateSingleLengthLimit < text.length) {
        console.log("text is too long for translate single, use translate long");
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
    let result = response.translations[0].translatedText;

    let translateAddition = translateAdditionList.get(id);
    if (translateAddition) {
        return translateAddition(result);
    }

    return result;
}

async function translateCloudFile(fileName, outputPath) {
    if (!doLongText) {
        throw new Error("translate cloud file was called but do long text is false");
    }
    if (!(await bucketExist)[0]) {
        throw new Error(`google cloud bucket does not exist. name: ${bucketName}`);
    }

    // output path needs to be empty
    let [files] = await bucket.getFiles({
        prefix: outputPath,
    });
    await Promise.all(files.map(file => file.delete({ignoreNotFound: true})));

    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        sourceLanguageCode: 'en',
        targetLanguageCodes: [languageCode],
        inputConfigs: [
            {
                mimeType: 'text/html',
                gcsSource: {
                    inputUri: `gs://${bucketName}/${fileName}`,
                }
            }
        ],
        outputConfig: {
            gcsDestination: {
              outputUriPrefix: `gs://${bucketName}/${outputPath}`,
            },
          },
      
    };
    const options = {timeout: 240000};
    try {
        const [operation] = await translationClient.batchTranslateText(
            request,
            options
        );

        await operation.promise();

        // the translation is not in the response, instead it's in the output folder
        let [files] = await bucket.getFiles({
            prefix: outputPath,
        }); 
        let suffix = `_${languageCode}_translations.html`;
        let htmlFiles = files.filter(file => file.name.endsWith(suffix));
        if (htmlFiles.length <= 0) { throw new Error("can't find translated cloud file after translating"); }
        let [translatedText] = await htmlFiles[0].download();

        // add the attribution to follow their rules
        return `${translatedText} ${googleTranslateAttribution}`;
    } catch(error) {
        console.error(error);
        throw error;
    }
}

const storageClient = doLongText ? new Storage() : null;
const bucket = storageClient ? storageClient.bucket(bucketName) : null;
const bucketExist = doLongText ? bucket.exists() : false;
let nextFileNumber = doLongText ? 0 : null;
async function translateLong(textToTranslate) {
    if (!doLongText) {
        throw new Error("translate long was called but do long text is false");
    }
    if (!(await bucketExist)[0]) {
        throw new Error(`google cloud bucket does not exist. name: ${bucketName}`);
    }
    
    let fileName = `translator-input_${languageCode}_${nextFileNumber}.html`;
    let outputPath = `translator-output_${nextFileNumber}/`;
    nextFileNumber += 1;
    // upload to google
    let file = bucket.file(fileName);
    await file.save(textToTranslate);
    return translateCloudFile(fileName, outputPath);
}

function createConfig(){
    let textTotalCount = 0;
    let textArrivedCount = 0;
    let promiseMap = new Map();

    let onAllText = () => {
        textArrivedCount += 1;
        if (textArrivedCount === textTotalCount) {

        }
    }
    return {
        "translatorFormat": "HTML",
        "name": languageName,
        "plurals": [{"match": "other", "value": 999}],
        "onParsedFile": (fileAsMap) => {
            textTotalCount = fileAsMap.size;
        },
        "onText": (id) => {
            if (!promiseMap.has(id)) {
                onAllText();
            }
        },
        "translate": (textToTranslate, id) => {
            onAllText();
            if (doLongText && translateSingleLengthLimit < textToTranslate.length) {
                return translateLong(textToTranslate)
            } else {
                return translateSingle(textToTranslate, id);
            }
        },
        "postProcess": (data) => {
            let {translatedText, usesPlurals, pluralKey} = data;
            if (languageCode === "zh-tw" && usesPlurals && pluralKey === null) {
                // handle strange edge case, plurals without a variable in chinese.
                // for some reason, it needs two plurals when there's only one plural rule.
                // adding a plural separator and a dup should make it behave as one plural
                // rule while using two plurals
                data.translatedText = `${translatedText}#|#${translatedText}`;
            }
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