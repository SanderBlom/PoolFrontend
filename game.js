const { createCanvas, loadImage } = require('canvas') //Used to draw images
const fs = require('fs') //used to access local files
//Based on https://blog.logrocket.com/creating-saving-images-node-canvas/


function convertCoordinatesX(inputX) {
    var ballRadius = 20 //Defining the ball radius. 
    var tableLength = 1114 - ballRadius
    var lengtdiff = 85//Diffrence in pixels between the edge of the table and the cloth where the balls exist.
    var x = (tableLength * inputX) + lengtdiff
    x = Math.trunc(x)
    return x;
}
function convertCoordinatesY(inputY) {
    var ballRadius = 20 //Defining the ball radius. 
    var tableHeight = 569 - ballRadius
    var lengtdiff = 85//Diffrence in pixels between the edge of the table and the cloth where the balls exist.
    var y = (tableHeight * inputY) + lengtdiff
    y = Math.trunc(y) 
    return y;
}

function renderballs(wholeBalls, halfBalls) {
    return new Promise((resolve, reject) => {
        const billiardboard = createCanvas(1280, 731)
        const billiardballs = createCanvas(1280, 731)
        var context = billiardboard.getContext('2d')
        var context2 = billiardballs.getContext('2d')

        loadImage('views/img/pooltable.png').then(image => {
            context.clearRect(0, 0, 1280, 731)
            context.drawImage(image, 0, 0, 1280, 731)//draws the pooltable to the canvas
            //context2.globalCompositeOperation = 'source-over';
            context2.clearRect(0, 5, 1280, 731)

            for (let ball of wholeBalls) {
                //Converting the 0-1 cordinates 

                ball.x = convertCoordinatesX(ball.x)
                ball.y = convertCoordinatesY(ball.y)

                //Making the main ball
                if (ball.number != 0) {
                    context2.beginPath();
                    context2.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
                    context2.fillStyle = ball.color;
                    context2.fill();
                    //Making inner white circle
                    context2.beginPath();
                    context2.arc(ball.x, ball.y, 12, 0, Math.PI * 2, true)
                    context2.fillStyle = "white";
                    context2.fill();
                    //Adding number
                    context2 = billiardballs.getContext("2d");
                    context2.font = '12pt Calibri';
                    context2.fillStyle = 'black';
                    context2.textAlign = 'center';
                    context2.fillText(ball.number, ball.x, ball.y + 5);
                }

                else {

                    //Making the white ball
                    context2.beginPath();
                    context2.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
                    context2.fillStyle = ball.color;
                    context2.fill();
                }
            }
            for (let ball of halfBalls) {
                //Making the main ball
                ball.x = convertCoordinatesX(ball.x)
                ball.y = convertCoordinatesY(ball.y)
                context2.beginPath();
                context2.arc(ball.x, ball.y, 20, 0, Math.PI * 2, true)
                context2.fillStyle = ball.color;
                context2.fill();
                //Making inner white line
                context2.beginPath();
                context2.rect(ball.x - 19, ball.y - 10, 37.7, 7)//Top line
                context2.rect(ball.x - 20, ball.y - 5, 39.5, 10)//Middle line
                context2.rect(ball.x - 19, ball.y, 37.7, 7)//Lower line
                context2.fillStyle = "white";
                context2.fill();
                //Adding number
                context2 = billiardballs.getContext("2d");
                context2.font = '12pt Calibri';
                context2.fillStyle = 'black';
                context2.textAlign = 'center';
                context2.fillText(ball.number, ball.x, ball.y + 5);
            }
            context.drawImage(billiardballs, 0, 0, 1280, 731)//draws the pooltable to the canvas
            const buffer = billiardboard.toDataURL('image/png') //Generates a base64 string out of the image 

            if (buffer != null) {
                resolve(buffer) //Returns the base64 string if is't not null
            }
            else {
                reject('Image could not be generated')
            }

        })

        //console.log('Buffer : ' + buffer  
        //fs.writeFileSync('./test.png', buffer)
    })

}



module.exports = { renderballs }