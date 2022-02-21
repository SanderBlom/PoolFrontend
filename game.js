const { createCanvas, loadImage } = require('canvas') //Used to draw images
const fs = require('fs') //used to access local files
//Based on https://blog.logrocket.com/creating-saving-images-node-canvas/





function renderballs(wholeBalls, halfBalls) {
    //context.fillStyle = grd
    return new Promise((resolve, reject) => {
        const canvas = createCanvas(1200, 600)
        var context = canvas.getContext('2d')
        loadImage('views/img/pooltable.png').then(image => {
            context.fillRect(0, 0, 1200, 600)
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
                context.rect(ball.x - 19, ball.y - 10, 37.7, 7)//Top line
                context.rect(ball.x - 20, ball.y - 5, 39.5, 10)//Middle line
                context.rect(ball.x - 19, ball.y, 37.7, 7)//Lower line
                context.fillStyle = "white";
                context.fill();
                //Adding number
                context = canvas.getContext("2d");
                context.font = '12pt Calibri';
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.fillText(ball.number, ball.x, ball.y + 5);
            }

            const buffer = canvas.toDataURL('image/png') //Generates a base64 string out of the image 

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