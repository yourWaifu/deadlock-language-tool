import fs from 'node:fs/promises';
import Tokenizr from "tokenizr";
import toShavian from "to-shavian";
import path from "node:path";
import crypto from "node:crypto";
import protobuf from "protobufjs/light.js";

// because translating text cost time and money, we want to avoid redoing already finished work
// So we need to know if previous strings are identical but putting hash has in JSON would create
// huge files so we store our data in protobuf to save space
let fileCacheType = new protobuf.Type("FileCache");
fileCacheType.add(new protobuf.Field("language", 1, "string"));
fileCacheType.add(new protobuf.Field("inputFile", 2, "string"));
fileCacheType.add(new protobuf.Field("date", 3, "double"));
fileCacheType.add(new protobuf.MapField("hashMap", 4, "string", "bytes"));
var protobufRoot = new protobuf.Root().define("Cache").add(fileCacheType);
let CacheType = new protobuf.Type("Cache");
CacheType.add(new protobuf.Field("files", 1, "FileCache", "repeated"));
CacheType.add(new protobuf.Field("charCount", 2, "double"));
protobufRoot.add(CacheType);

let charCounter = 0;

export async function translateFile(filePath, langConfig) {
    // lang config type checks
    const translatorFormat = langConfig["translatorFormat"];
    const language = langConfig["name"];
    const knownFormats = {"separated": true, "HTML": true, "raw": true};
    const pluralRules = langConfig["plurals"] ?? [
        {"match": "one", "value": 1}, {"match": "other", "value": 9.9}
    ];
    if (!knownFormats[translatorFormat]) {
        throw new Error("Unknown Translator format");
        return;
    }
    if (!langConfig["translate"] && typeof langConfig["translate"] !== 'function') {
        throw new Error("Translate isn't a function");
        return;
    }

    // Start

    let targetLanguage = language;
    let languageCache = cache.get(targetLanguage);
    let isFirstTime = !languageCache;
    if (!languageCache) {
        cache.set(targetLanguage, new Map());
        languageCache = cache.get(targetLanguage);
    }

    let outputName = path.basename(filePath, ".txt");
    outputName = `${outputName.substring(0, outputName.lastIndexOf('_'))}_${targetLanguage}.txt`;
    let outputDir = path.join("out/", path.dirname(filePath));
    let outputPath = path.join(outputDir, outputName);

    // ----------------
    // PARSER
    // ----------------
    let parseFile = async (filePromise) => {
        let lexer = new Tokenizr();

        lexer.rule(/\/\/[^\r\n]*\r?\n/, (ctx, match) => {
            ctx.ignore()
        });
        lexer.rule(/[ \t\r\n]+/, (ctx, match) => {
            ctx.ignore();
        });
        lexer.rule(/"((?:\\"|[^"\r\n])*)"/, (ctx, match) => {
            ctx.accept("string", match[1].replace(/\\"/g, "\""))
        });
        lexer.rule(/./, (ctx, match) => {
            ctx.accept("char")
        });

        let input = await filePromise;
        lexer.input(input);

        let tokenList = lexer.tokens();

        let result = new Map();
        let index = 0;
    
        function parse(current) {
            let token;
            while (index < tokenList.length) {
                // the format always starts with a id
                token = tokenList[index];
                if (!token.isA("string")) {
                    index += 1;
                    continue;
                } else if (token.isA("EOF")) {
                    throw new Error("expected id, found ending");
                }
                let id = token.value;
                index += 1;
                // after the id is the value
                token = tokenList[index];
                if (token.isA("char", "{")) {
                    let obj = new Map();
                    index += 1;
                    parse(obj);
                    current.set(id, obj);
                } else if (token.isA("string")) {
                    current.set(id, token.value);
                    index += 1;
                } else if (token.isA("EOF")) {
                    throw new Error("expected value, found ending");
                }
                // end of id value pair
                token = tokenList[index];
                if (token.isA("char", "}")) {
                    break;
                } else if (token.isA("EOF")) {
                    throw new Error("expected pair, found ending");
                }
            }
        }
    
        parse(result);
        return result;
    }
    
    let resultPromise = parseFile(fs.readFile(filePath, 'utf8'));

    // read the previous one if it exist
    let prevRun = null;
    if (!isFirstTime) {
        try {
            prevRun = await parseFile(fs.readFile(outputPath, 'utf8'))
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }
    }

    let result = await resultPromise;

    // --------------
    // Convert
    // --------------

    // 2nd token stage
    let knownVariableSet = new Set(["{", "}", "%s1", '%s2', '%s3', "<", ">", "\\", "#|#"]);

    let lang = result.get("lang");
    lang.set("Language", targetLanguage);
    let valueMap = lang.get("Tokens");
    let hashMap = new Map();
    langConfig["onParsedFile"]?.(valueMap);
    await Promise.allSettled([...valueMap.entries()].map(async ([key, value]) => {

        // ignore postfix and prefix, due to automation failing here
        if (/.*(_postfix|_prefix)$/.test(key)) {
            langConfig["onText"]?.(key, value);
            let affix = langConfig["translateAffix"]?.(key);
            if (!affix) {
                return;
            } else {
                valueMap.set(key, affix);
            }
        }

        let ignoreSet = new Set([
            "Citadel_Scoreboard_KDA_Kills", "Citadel_Scoreboard_KDA_Deaths", "Citadel_Scoreboard_KDA_Assists"]);

        if (ignoreSet.has(key) || value === "") {
            // ignore net worth, due to automation failing here
            // skip empty strings
            // we still need to give it to the config, just in case it's counting them
            langConfig["onText"]?.(key, value);
            return;
        }

        // set up value setter to reduce code dup
        let hash = crypto.hash("md5", value, "buffer");
        const setValue = (translated) => {
            valueMap.set(key, translated);
            langConfig["onText"]?.(key, translated);
            hashMap.set(key, hash);
        }

        // read cache to save time on already translated values
        if (prevRun !== null && !isFirstTime) {
            let prevInputHash = languageCache.get(key)?.inputHash;
            if (prevInputHash && prevInputHash.compare(hash) === 0) { // if both inputs are equal
                let prevValue = prevRun.get("lang")?.get("Tokens")?.get(key);
                if (typeof prevValue === "string" || prevValue instanceof String) {
                    langConfig["onCachedText"]?.(key, prevValue);
                    setValue(prevValue);
                    return;
                }
            }
        }

        // handle number formats
        let numberSet = new Set([
            "Citadel_Hud_TopbarPlayerNetworthPlayerMed", "Citadel_Hud_TopbarPlayerNetworthPlayerHigh",
            "Citadel_Hud_TopbarPlayerNetworth", "Citadel_Watch_Page_NetWorthTeam0", "Citadel_Watch_Page_NetWorthTeam1",
            "Citadel_MatchDetails_Team1NetWorth", "Citadel_MatchDetails_Team2NetWorth",
            "Citadel_Profile_Stats_Value_Networth_High"]);
        if (numberSet.has(key)) {
            let universalThousands = "𐍋"; // you need the special font to see it
            let englishThousandsPattern = /\b[Kk]\b/g;
            let universalText = value.replace(englishThousandsPattern, universalThousands);

            setValue(universalText);
            return;
        }

        // read key to get hints
        let usesPlurals = false;
        let pluralSeparators = [];
        {
            // https://regex101.com/r/7tlxsg/1
            let match = /.*(:p|:p{(.*)})$/.exec(key);
            if (match && match[1]) {
                let hasVariable = Boolean(match[2]);
                // plurals without a variable are an exception. I don't know why
                if (pluralRules || !hasVariable) {
                    usesPlurals = match[2] ?? true;
                }
                // the game doesn't support plurals for some languages
                // those languages would crash when using plurals, so it's better to remove them
                // plurals without a variable are an exception. I don't know why
                let removePluralFromKey = usesPlurals === false;
                if (removePluralFromKey) {
                    valueMap.delete(key);
                    key = key.slice(0, match[1].length * -1);
                }
                
                // edit text to use more or less plurals if needed
                let editedValueCount = pluralRules ? pluralRules.length : 1;
                let values = value.split("#|#");
                let editedTextList = [];
                let repeatingText = 2 <= values.length ? values[1] : values[0];
                if (editedValueCount === 1) {
                    editedTextList.push(repeatingText);

                } else if (2 <= editedValueCount) {
                    editedTextList = values;
                    while (editedTextList.length < editedValueCount) {
                        editedTextList.push(repeatingText)
                    }
                }
                value = editedTextList.join("#|#");

                pluralSeparators.length = editedValueCount;
                let pluralSeparator = /#\|#/g;
                pluralSeparators = [...value.matchAll(pluralSeparator)].map(a => a.index);
                pluralSeparators[editedValueCount - 1] = value.length;
            }
        }

        // paring text for variables and features
        
        let variableLexer = new Tokenizr();
    
        variableLexer.rule(/\{(.*?)\}/, (ctx, match) => {
            ctx.accept("variable", match[1]);
        });
        variableLexer.rule(/%(s\d)/, (ctx, match) => {
            ctx.accept("variable", match[1]);
        });
        variableLexer.rule(/<\/[a-zA-Z]*?>/, (ctx, match) => {
            ctx.accept("xml-end");
        });
        variableLexer.rule(/<[^>]+>/, (ctx, match) => {
            ctx.accept("xml");
        });
        variableLexer.rule(/%(\S*?)%/, (ctx, match) => {
            ctx.accept("variable", match[1]);
        });
        variableLexer.rule(/\\./, (ctx, match) => {
            ctx.accept("escape");
        });
        {
            let pluralCount = 0;
            variableLexer.rule(/#\|#/, (ctx, match) => {
                pluralCount += 1;
                ctx.accept("plural-separator", pluralCount);
            });
            variableLexer.finish((ctx) => {
                pluralCount += 1;
            });
        }
        // I feel like this is slow, but not sure how else to do it
        {
            let plaintext = "";
            variableLexer.before((ctx, match, rule) => {
                if (rule.name !== "plaintext" && plaintext !== "") {
                    ctx.accept("plaintext", plaintext)
                    plaintext = ""
                }
            })
            variableLexer.rule(/./, (ctx, match) => {
                plaintext += match[0]
                ctx.ignore()
            }, "plaintext")
            variableLexer.finish((ctx) => {
                if (plaintext !== "")
                    ctx.accept("plaintext", plaintext)
            });
        }
    
        variableLexer.input(value);
        let tokenList = variableLexer.tokens();
        let variableTokenList = [];
        let textInputSplit = [];
        var translatorFormatHintsStart = {
            "separated": () => {
                if (usesPlurals === true) {
                    textInputSplit.push("{}");
                    variableTokenList.push("");
                }
            },
            "HTML": () => {
                if (usesPlurals === true) {
                    let key = "#|#0";
                    // give hints to the translator for languages with plural rules
                    // languages with one plural rule, needs more hints
                    textInputSplit.push(
                        `<var id="${key}">${1 <= pluralRules.length ? pluralRules[0].value : ""}${pluralRules.length === 1 ? " quantity" : ""} </var>`
                    );
                    variableTokenList.push([key, ""]);
                }
            }
        }
        var translatorFormatInputTransformer = {
            "separated": (token) => {
                if (token.isA("plaintext")) { // {}
                    textInputSplit.push(token.value);
                } else if (token.isA("EOF")) { // end of file
                    return;
                } else if (token.isA("variable")) {
                    textInputSplit.push(`{${token.value}}`); // variable identifier
                    variableTokenList.push(token.text);
                } else {
                    textInputSplit.push("{}"); // split identifier
                    variableTokenList.push(token.text);
                }
            },
            "HTML": (token) => { // HTML
                if (token.isA("plaintext")) {
                    textInputSplit.push(token.value);
                } else if (token.isA("EOF")) { // end of file
                    return;
                } else if (token.isA("escape")) {
                    textInputSplit.push(`<esc char="${token.text.slice(1)}"></esc>`);
                } else if (token.isA("xml") || token.isA("xml-end")) {
                    textInputSplit.push(token.value);
                } else if (token.isA("plural-separator")) {
                    let key = `#|#${token.value}`;
                    let text = "";
                    if (pluralRules && usesPlurals === true && token.value < pluralRules.length) {
                        // insert value to help translator
                        text = pluralRules[token.value].value;
                    }
                    textInputSplit.push(`<var id="${key}"> ${text}</var>`)
                    variableTokenList.push([key, token.text]);
                } else if (token.value) {
                    let innerText = "";
                    // get variable name to do additional logic
                    // names are done like this {format:name} or {format:format-info:name}
                    // {} not included, extracting the name is last : to end of string
                    if (pluralRules && usesPlurals) {
                        // https://regex101.com/r/dHb4ZT/1
                        let match = /:(\w*)$/.exec(token.value);
                        if (match && 2 <= match.length && match[1] === usesPlurals) {
                            // the variable is a plural, so inner text should the plural value
                            for (let index = 0; index < pluralSeparators.length; index += 1) {
                                if (pluralRules.length < index) {
                                    break;
                                }
                                if (token.pos < pluralSeparators[index]) {
                                    innerText = pluralRules[index].value;
                                    break;
                                }
                            }
                        }
                    }

                    textInputSplit.push(`<var id="${token.value}">${innerText}</var>`); // variable identifier
                    variableTokenList.push([token.value, token.text]);
                }
            },
            "raw": (token) => {
                textInputSplit.push(token.value);
            }
        }
        translatorFormatHintsStart[translatorFormat]();
        tokenList.forEach(translatorFormatInputTransformer[translatorFormat]);
        let textToTranslate = textInputSplit.join("");
        let translatedText = "";
        try {
            translatedText = await langConfig["translate"](textToTranslate, key);
            charCounter += textToTranslate.length;   // count chars for the AI cost calculator
        } catch {
            console.log(`Failed to translate ${key}, skipping`);
            valueMap.delete(key);
            return;
        }

        let fromTranslatedToOutTransformer = {
            "separated": () => {
                let translatedTextSplit = translatedText.split(/\{(.*?)\}/);
                let transformedTextSplit = [];
                for (let i = 0; i < translatedTextSplit.length; i += 1) {
                    if (i % 2 !== 0 && ((i - 1) / 2) < variableTokenList.length) {
                        transformedTextSplit.push(variableTokenList[(i - 1) / 2]);
                    } else {
                        transformedTextSplit.push(translatedTextSplit[i]);
                    }
                }
                return transformedTextSplit.join("");
            },
            "HTML": () => {
                let HTMLLexer = new Tokenizr();
                HTMLLexer.rule(/<var id=\"(.*?)\">(.*?)<\/var>/, (ctx, match) => {
                    ctx.accept("variable", { id: match[1], inner: match[2] });
                });
                HTMLLexer.rule(/<esc char=\"(.*?)\">.*?<\/esc>/, (ctx, match) => {
                    ctx.accept("escape", match[1]);
                });
                {
                    let plaintext = "";
                    HTMLLexer.before((ctx, match, rule) => {
                        if (rule.name !== "plaintext" && plaintext !== "") {
                            ctx.accept("plaintext", plaintext)
                            plaintext = ""
                        }
                    })
                    HTMLLexer.rule(/./, (ctx, match) => {
                        plaintext += match[0]
                        ctx.ignore()
                    }, "plaintext")
                    HTMLLexer.finish((ctx) => {
                        if (plaintext !== "")
                            ctx.accept("plaintext", plaintext)
                    });
                }
                HTMLLexer.input(translatedText);
                let transformedTextSplit = [];
                HTMLLexer.tokens().forEach((token) => {
                    if (token.isA("plaintext")) {
                        transformedTextSplit.push(token.value)
                    }
                    else if (token.isA("escape")) {
                        transformedTextSplit.push(`\\${token.value}`);
                    } else if (token.isA("variable")) {
                        // we search a list instead of a map due to the possibility of dups
                        let foundPair = variableTokenList.findIndex((pair) => pair[0] === token.value.id);
                        if (foundPair === undefined || foundPair === -1) {
                            throw Error("variable pair not found");
                            return;
                        }
                        let variable = variableTokenList[foundPair][1];
                        let nextText = variable;
                        if (token.value.inner && token.value.inner !== "") {
                            nextText = token.value.inner.replace(/[,\.0-9]+/g, variable).trim();
                            if (token.value.id.startsWith("#|#")) {
                                // handle plural separators with variables
                                if (!nextText.includes("#|#"))
                                    nextText = `${variable}${nextText}`;
                            }
                        }
                        transformedTextSplit.push(nextText);
                        variableTokenList.splice(foundPair, 1);
                    }
                });
                return transformedTextSplit.join("");
            },
            "raw": () => {
                return translatedText;
            }
        };
    
        // Software often uses variables in their strings for language formats and changing values in text 
        let finishedText = fromTranslatedToOutTransformer[translatorFormat]();

        // POST process
        if (langConfig["postProcess"]) {
            langConfig["postProcess"]({
                key,
                get translatedText() {
                    return finishedText;
                },
                set translatedText(incomingText) {
                    finishedText = incomingText;
                },
                usesPlurals: Boolean(usesPlurals),
                pluralKey: typeof usesPlurals === "boolean" ? null : usesPlurals,
            });
        }

        setValue(finishedText);
        variableLexer.reset();
    }));

    // -------------
    // Serializer
    // -------------

    let outputList = [];
    function serialize(input, level) {
        input.forEach((value, key) => {
            if (value instanceof Map) {
                outputList.push(`${level}\"${key}\"\r\n${level}{`);
                serialize(value, `${level}\t`);
                outputList.push(`${level}}`);
            } else if (value instanceof String || typeof(value) === 'string') {
                // don't forget to convert the " letter to \"
                outputList.push(`${level}\"${key}\"\t\t\"${value.replace(/\"/g, "\\\"")}\"`);
            }
        });
    }
    serialize(result, "");
    let output = outputList.join("\r\n");

    let directoryPromise = fs.mkdir(outputDir, {recursive: true});
    await directoryPromise;
    await fs.writeFile(outputPath, output, {flag: 'w', encoding: 'utf8'});
    return {
        language: targetLanguage,
        inputFile: filePath,
        date: Date.now(),
        hashMap: Object.fromEntries(hashMap),
    }
}

let cache = new Map();
let cachedFiles = new Map();
await (async () => {
    let cacheJSObj;
    try {
        let cacheFile = await fs.readFile("out/cache.buffer");
        let cacheProtobuf = CacheType.decode(cacheFile);
        cacheJSObj = CacheType.toObject(cacheProtobuf);
    } catch(err) {
        if (err.code === "ENOENT") {
            return;
        } else {
            throw err;
        }
    }

    for (let file of cacheJSObj.files) {
        cachedFiles.set(`${file.inputFile}:${file.language}`, {
            ...file,
            date: new Date(file.date)
        });
        let languageCache = cache.get(file.language);
        if (!languageCache) {
            cache.set(file.language, new Map());
            languageCache = cache.get(file.language);
        }
        for (let key in file.hashMap) {
            languageCache.set(key, { inputHash: file.hashMap[key] });
        }
    }
})();

export async function saveCache(translateResultListPromise) {
    let directoryPromise = fs.mkdir("out/", {recursive: true});
    await directoryPromise;

    let list = await translateResultListPromise;
    list.forEach((file) => {
        cachedFiles.set(`${file.inputFile}:${file.language}`, file);
    });
    let cachedFilesList = [...cachedFiles.values()];

    fs.writeFile("out/cache.buffer", CacheType.encode(CacheType.create({
        files: cachedFilesList,
        charCount: charCounter,
    })).finish(), {flag: 'w', encoding: "binary"});
    fs.writeFile("out/date.html", ((reportList) => {
        let dataToInclude = reportList.map((report) => {
            return {date: report.date};
        });
        let script = `
        let data = JSON.parse('${JSON.stringify(dataToInclude).replace(/\'/g, "\\\'")}');
        data.forEach((report, index) => {
            let dateElement = document.getElementById(\`\${index}.date\`);
            dateElement.textContent = (new Date(report.date)).toLocaleString(undefined, {timeZoneName: "short"});
        });
        `;
        return `<!DOCTYPE html><html><head></head><body>characters translated: ${charCounter}<br><br>${reportList.map((report, index) => {
            return `<div>language: ${report.language}<br>input file: ${report.inputFile}<br>date: <span id="${index}.date">${report.date.toString()}</span></div>`;
        }).join("<br>")}<script>${script}</script></body></html>`
    })(cachedFilesList), {flag: 'w', encoding: 'utf8'});
}