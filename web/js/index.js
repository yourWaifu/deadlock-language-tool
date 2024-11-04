import {PaperScope} from "paper";

// The rollup bundle name is Bundle and the format is iife, so here's an example
// Bundle.setupPaper(canvasNode);
export function setupPaper(canvasNode) {
    let paper = new PaperScope();
    paper.setup(canvasNode);
    return paper;
}