import "paper";

window.onload = () => {
    var canvas = document.getElementById("textCanvas");
    paper.setup(canvas);
    var path = new paper.Path();
    path.strokeColor = 'black';
    var start = new paper.Point(100, 100);
    path.moveTo(start.add([200, -50]));
    paper.view.draw();
}