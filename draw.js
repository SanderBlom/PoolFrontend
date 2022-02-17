const { createCanvas, loadImage } = require('canvas') //Used to draw images
const fs = require('fs') //used to access local files
const width = 1200
const height = 600
//Based on https://blog.logrocket.com/creating-saving-images-node-canvas/

const canvas = createCanvas(width, height)
var context = canvas.getContext('2d')

const wholeBalls = [
    { tag: "yellow", x: 100, y: 80, color: "yellow", number: 1 },
    { tag: "blue", x: 200, y: 400, color: "blue", number: 2 },
    { tag: "red", x: 500, y: 500, color: "red", number: 3 },
    { tag: "purple", x: 1000, y: 500, color: "purple", number: 4 },
    { tag: "orange", x: 900, y: 200, color: "orange", number: 5 },
    { tag: "green", x: 950, y: 300, color: "#007733", number: 6 },
    { tag: "brown", x: 600, y: 333, color: "brown", number: 7 },
    { tag: "black", x: 444, y: 513, color: "black", number: 8 },
    { tag: "white", x: 1100, y: 80, color: "white", number: null }
];


const halfBalls = [
    { tag: "yellow-half", x: 200, y: 80, color: "yellow", number: 9 },
    { tag: "blue-half", x: 250, y: 400, color: "blue", number: 10 },
    { tag: "red-half", x: 300, y: 500, color: "red", number: 11 },
    { tag: "purple-half", x: 800, y: 500, color: "purple", number: 12 },
    { tag: "orange-half", x: 950, y: 200, color: "orange", number: 13 },
    { tag: "green-half", x: 900, y: 300, color: "#007733", number: 14 },
    { tag: "brown-half", x: 650, y: 333, color: "brown", number: 15 }
];

function rederballs(wholeBalls, halfBalls) {
    loadImage('views/img/pooltable.png').then(image => {
        //context.fillStyle = grd
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, 1200, 600)//draws the pooltable to the canvas

        for (let ball of wholeBalls) {
            //Making the main ball

            if (ball.tag != "white") {
                context.beginPath();
                context.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
                context.fillStyle = ball.color;
                context.fill();
                //Making inner white circle
                context.beginPath();
                context.arc(ball.x, ball.y, 12, 0, Math.PI * 2, true)
                context.fillStyle = "white";
                context.fill();

                //Adding number
                context = canvas.getContext("2d");
                context.font = '12pt Calibri';
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.fillText(ball.number, ball.x, ball.y + 5);
            }

            else {
                context.beginPath();
                context.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
                context.fillStyle = ball.color;
                context.fill();
                //Making inner white circle
                context.beginPath();
                context.arc(ball.x, ball.y, 12, 0, Math.PI * 2, true)
                context.fillStyle = "white";
                context.fill();
            }
        }

        for (let ball of halfBalls) {
            //Making the main ball
            context.beginPath();
            context.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
            context.fillStyle = ball.color;
            context.fill();
            //Making inner white line
            context.beginPath();
            context.rect(ball.x-19, ball.y-10, 37.7, 7)//Top line
            context.rect(ball.x-20, ball.y-5, 39.5, 10)//Middle line
            context.rect(ball.x-19, ball.y, 37.7, 7)//Lower line

            context.fillStyle = "white";
            context.fill();

            //Adding number
            context = canvas.getContext("2d");
            context.font = '12pt Calibri';
            context.fillStyle = 'black';
            context.textAlign = 'center';
            context.fillText(ball.number, ball.x, ball.y + 5);

        }
        const buffer = canvas.toBuffer('image/png')
        fs.writeFileSync('./test.png', buffer)
    })



}




