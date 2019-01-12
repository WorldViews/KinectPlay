
var lastBodyFrame = null;
var compression = 3;
//compression = 5;
//compression = 4;
var canvWd = 1920/compression;
var canvHt = 1080/compression;

function setCompression(c)
{
    alert("setCompression "+c);
    compression = c;
    canvWd = 1920/compression;
    canvHt = 1080/compression;
    colorWorkerThread.postMessage({
        "message": "setImageData",
        "imageData": bodyDrawer.ctx.createImageData(canvWd, canvHt)
    });
}

getParameterByName = function(name, defaultVal) {
    if (typeof window === 'undefined') {
        console.log("***** getParameterByName called outside of browser...");
        return defaultVal;
    }
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    val = match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    if (!val)
        return defaultVal;
    return val;
}

function getClockTime()
{
    return new Date().getTime()/1000.0;
}

var bodyDrawer = null;
var socket = io.connect('/');
var colorProcessing = false;
var colorWorkerThread = new Worker("js/colorWorker.js");

var bfn0 = -1;
var cfn0 = -1;
var t0 = -1;

function initStats(stats) {
    bfn0 = stats.bodyFrameNum;
    cfn0 = stats.colorFrameNum;
    t0 = getClockTime();
}

function resetStats()
{
    bfn0 = -1;
}

function handleStats(stats){
    //console.log("handleStats");
    if (bfn0 < 0)
        initStats(stats);
    var dt = getClockTime() - t0;
    dt = dt || 0.0001;
    //var bfn = stats.bodyFrameNum - bfn0;
    //var cfn = stats.colorFrameNum - cfn0;
    var bfn = stats.bodyFrameNum;
    var cfn = stats.colorFrameNum;
    var str = sprintf(
        "BodyFrames: %d (%.2f fps) ColorFrames: %d (%.2f fps) rec: %s  view: %s<br>%s",
        bfn, bfn/dt, cfn, cfn/dt, stats.recording, stats.viewing, stats.recSession);
    if (compression != stats.compression) {
        str += "*** compression mismatch ***"
        setCompression(stats.compression);
    }
    $("#stats").html(str);
}

socket.on('stats', handleStats);

socket.on('bodyFrame', function(bodyFrame){
    lastBodyFrame = bodyFrame;
});

var canvas2 = null;
function imagedata_to_image(imagedata) {
    //console.log("imagedata_to_image "+imagedata.width+" "+imagedata.height);
    if (canvas2 == null) {
        console.log("Creating canvas2");
        canvas2 = document.createElement('canvas');
    }
    var ctx = canvas2.getContext('2d');
    canvas2.width = imagedata.width;
    canvas2.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);

    var image = new Image();
    image.src = canvas2.toDataURL();
    //console.log("image w h "+image.width+" "+image.height);
    return image;
}
/*
colorWorkerThread.addEventListener("message", function (event) {
    if(event.data.message === 'imageReady') {
        bodyDrawer.clearBackground();
        bodyDrawer.ctx.putImageData(event.data.imageData, 0, 0);
        //bodyDrawer.ctx.putImageData(event.data.imageData, 0, 0, 0, 0, 900, 700);
        colorProcessing = false;
    	bodyDrawer.draw(lastBodyFrame);
    }
});
*/
colorWorkerThread.addEventListener("message", function (event) {
    if(event.data.message === 'imageReady') {
        var img = imagedata_to_image(event.data.imageData)
        colorProcessing = false;
        img.addEventListener('load', () => {
            bodyDrawer.clearBackground(img);
    	    bodyDrawer.draw(lastBodyFrame);
        });
    }
});

socket.on('colorFrame', function(imageBuffer){
    //console.log("got colorFrame");
    if(!colorProcessing) {
	colorProcessing = true;
	colorWorkerThread.postMessage({ "message": "processImageData", "imageBuffer": imageBuffer });
    }
});

$(document).ready(()=> {
    console.log("************READY**********");
    bodyDrawer = new BodyDrawer();
    colorWorkerThread.postMessage({
        "message": "setImageData",
        "imageData": bodyDrawer.ctx.createImageData(canvWd, canvHt)
    });
    $("#startRecordingButton").click(() => {
        console.log("start recording");
        $.get("/startRecording", (data) => { console.log("ok"); });
    });
    $("#stopRecordingButton").click(() => {
        console.log("stop recording");
        $.get("/stopRecording", (data) => {
            console.log("ok");
            resetStats();
        });
    });
    $("#startViewingButton").click(() => {
        console.log("start viewing");
        $.get("/startViewing", (data) => { console.log("ok"); });
    });
    $("#stopViewingButton").click(() => {
        console.log("stop viewing");
        $.get("/stopViewing", (data) => { console.log("ok"); });
    });
})
