import {createServer} from "node:http";
import {readFile} from "node:fs/promises"
import path from "node:path";
import {rollup} from "rollup";
import { nodeResolve } from '@rollup/plugin-node-resolve';

const inputOptions = {
    input: {
        "js/index.js": "./web/js/index.js"
    },
    plugins: [
        nodeResolve()
    ]
};

const outputOptionsList = [
    {
        dir: "web/client/",
        format: "iife",
        sourcemap: true,
        generatedCode: "es2015",
    }
];

let modules;

async function build() {
    let bundle;
    let buildFailed = false;
    try {
        bundle = await rollup(inputOptions);
        console.log(bundle.watchFiles);
        await generateOutputs(bundle);
    } catch (error) {
        buildFailed = true;
        console.error(error);
    }
    if (bundle) {
        await bundle.close();
    }
    return buildFailed ? false : true;
}

async function generateOutputs(bundle) {
    for (const outputOption of outputOptionsList) {
        const { output } = await bundle.generate(outputOption);

        for (const chunkOrAsset of output) {
            if (chunkOrAsset.type === "asset") {
                console.log('Asset', chunkOrAsset);
            } else {
                let incomingModules = {};
                for (let [key, value] of Object.entries(chunkOrAsset.modules)) {
                    incomingModules[path.relative("./", key)] = value;
                }
                modules = {...modules, ...incomingModules};
            }
        }
    }
}
let sourceFiles = build();

const host = "localhost";
const port = 8000;

const requestListener = async (req, res) => {
    let codePath = path.relative("/", req.url);
    if (modules[codePath]) {
        res.writeHead(200, { 'Content-Type': 'text/javascript'});
        res.end(modules[codePath].code)
    } else {
        let filepath = path.join("./web/client", req.url);
        let filePromise = readFile(filepath);
        try {
            let data = await filePromise;
            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(data);
        } catch {
            res.writeHead(404, {"Content-Type": "text"});
            res.end(`404 filepath ${filepath}`);
        }
    }
};

const server = createServer(requestListener);
if (await sourceFiles) {
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}/index.html`);
    });
} else {
    console.error("failed to build web client");
}