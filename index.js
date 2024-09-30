import fs from 'node:fs/promises';
import Tokenizr from "tokenizr";
import toShavian from "to-shavian";
import path from "node:path";

async function localizeFile(filePath) {
    let filePromise = fs.readFile(filePath, 'utf8');

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

    // ----------------
    // PARSER
    // ----------------
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
            }
            // end of id value pair
            token = tokenList[index];
            if (token.isA("char", "}")) {
                break;
            }
        }
    }

    parse(result);

    // --------------
    // Convert
    // --------------

    let targetLanguage = "shavian";

    // 2nd token stage
    let knownVariableSet = new Set("{", "}", "%s1", '%s2', '%s3', "<", ">", "\\");

    let lang = result.get("lang");
    lang.set("Language", targetLanguage);
    let valueMap = lang.get("Tokens");
    for (const [key, value] of lang.get("Tokens")) {
        // ignore postfix and prefix, due to automation failing here
        if (/.*(_postfix|_prefix)$/.test(key)) {
            continue;
        }
        
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
        // I feel like this is slow, but not sure how else to do it
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

        variableLexer.input(value);
        let tokenList = variableLexer.tokens();
        let variableTokenList = [];
        let textInputSplit = [];
        tokenList.forEach((token) => {
            if (token.isA("plaintext")) {
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
        });
        let translatedText = toShavian(textInputSplit.join(""));
        let translatedTextSplit = translatedText.split(/\{(.*?)\}/);
        let transformedTextSplit = [];
        for (let i = 0; i < translatedTextSplit.length; i += 1) {
            if (i % 2 !== 0 && ((i - 1) / 2) < variableTokenList.length) {
                transformedTextSplit.push(variableTokenList[(i - 1) / 2]);
            } else {
                transformedTextSplit.push(translatedTextSplit[i]);
            }
        }

        // Software often uses variables in their strings for language formats and changing values in text 
        valueMap.set(key, transformedTextSplit.join("").replace(/\"/g, "\\\""));
        variableLexer.reset();
    }

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
                outputList.push(`${level}\"${key}\"\t\t\"${value}\"`);
            }
        });
    }
    serialize(result, "");
    let output = outputList.join("\r\n");

    let outputName = path.basename(filePath, ".txt");
    outputName = `${outputName.substring(0, outputName.lastIndexOf('_'))}_${targetLanguage}.txt`;
    let outputDir = path.join("out/", path.dirname(filePath));
    let directoryPromise = fs.mkdir(outputDir, {recursive: true});
    await directoryPromise;
    return fs.writeFile(path.join(outputDir, outputName), output, {flag: 'w', encoding: 'utf8'});
}

localizeFile('./resources/citadel_attributes/citadel_attributes_english.txt');
localizeFile('./resources/citadel_gc/citadel_gc_english.txt');
localizeFile('./resources/citadel_heroes/citadel_heroes_english.txt');
localizeFile('./resources/citadel_main/citadel_main_english.txt');
localizeFile('./resources/citadel_mods/citadel_mods_english.txt');