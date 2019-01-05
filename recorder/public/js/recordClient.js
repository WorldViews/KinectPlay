
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

var socket = io.connect('/');
var canvas = document.getElementById('bodyCanvas');
var colorProcessing = false;
var colorWorkerThread = new Worker("js/colorWorker.js");

//var ctx = canvas.getContext('2d');

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
    console.log("handleStats");
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
        alert("setting compression to server val "+stats.compression);
        setCompression(stats.compression);
    }
    $("#stats").html(str);
}

socket.on('stats', handleStats);

socket.on('bodyFrame', function(bodyFrame){
    lastBodyFrame = bodyFrame;
});

colorWorkerThread.addEventListener("message", function (event) {
    if(event.data.message === 'imageReady') {
        clearBackground();
        ctx.putImageData(event.data.imageData, 0, 0);
        colorProcessing = false;
    	drawBodies(lastBodyFrame);
    }
});

colorWorkerThread.postMessage({
    "message": "setImageData",
//    "imageData": ctx.createImageData(canvas.width, canvas.height)
    "imageData": ctx.createImageData(canvWd, canvHt)
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
