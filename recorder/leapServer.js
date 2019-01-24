
var express = require('express'),
    app = express(),
    recsApp = express();
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    WebSocket = require('ws'),
    fs = require('fs');


var recording = false;
var viewing = true;
var handsFrameNum = 0;
var recSession = null;
var recDir = null;
var poseDir = null;

const ws = new WebSocket("ws://localhost:6437/v7.json");
ws.on('open', () => {
    console.log("**** open");
});

ws.on('message', data => {
    handsFrameNum++;
    //console.log("data: "+JSON.stringify(data));
    if (recording) {
        var jsonPath = poseDir+"/"+handsFrameNum+".json";
        var obj = JSON.parse(data);
        saveJSON(jsonPath, obj);
    }
});

function getClockTime()
{
    return new Date().getTime()/1000.0;
}

function verifyDir(dir)
{
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: "+err);
    }
}

function mkDir(dir)
{
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: "+err);
    }
}

function getNames(dirPath)
{
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, function(err, items) {
            if (err) {
                console.log("err: "+err);
                reject(err);
                return;
            }
            resolve(items);
        });
    });
}

function sendSessions(dirPath, req, resp)
{
    console.log("sendSessions: dirPath: "+dirPath);
    getNames(dirPath).then((items) => {
        console.log("Names: "+items);
        var obj = {dir: dirPath, sessions:items};
        resp.send(obj);
    });
}


function getSession()
{
    var m = new Date();
    var session =
        m.getUTCFullYear() +"_"+
        (m.getUTCMonth()+1) +"_"+
        m.getUTCDate() + "__" +
        m.getUTCHours() + "_" +
        m.getUTCMinutes() + "_" +
        m.getUTCSeconds();
    recDir = "leapRecordings/"+session;
    verifyDir("leapRecordings");
    mkDir(recDir);
    poseDir = recDir;
    return session;
}


function saveJSON(path, obj)
{
    var json = JSON.stringify(obj, null, 4);
    console.log("saving JSON to "+path);
    fs.writeFile(path, json, (err) => {
        if (err) throw err;
        console.log("File saved");
    });
}

function startRecording()
{
    console.log("Start Recording");
    if (recording) {
        console.log("already recording");
        return;
    }
    recSession = getSession();
    console.log("recSession: "+recSession);
    console.log("recDir: "+recDir);
    handsFrameNum = 0;
    recording = true;
}

function stopRecording()
{
    console.log("Stop Recording");
    recording = false;
}

//startRecording();
var isGood = true;
if(isGood) {
        var port = 8003;
	server.listen(port);
        console.log('Server listening on port '+port);
        console.log('Point your browser to http://localhost:'+port);

	app.get('/', function(req, res) {
	    res.sendFile(__dirname + '/public/leap.html');
	});

        app.get('/sessions', function (req, resp) {
            console.log("/sessions path: "+req.path);
            var dirPath = req.path.slice("/dir/".length);
            dirPath =__dirname + "/leapRecordings";
            getNames(dirPath).then((items) => {
                console.log("Names: "+items);
                var obj = {dir: dirPath, sessions:items};
                resp.send(obj);
            });
        });
    
    	app.get('/startRecording', function(req, res) {
            startRecording();
	    res.sendFile(__dirname + '/public/record.html');
	});

    	app.get('/stopRecording', function(req, res) {
            stopRecording();
	    res.sendFile(__dirname + '/public/colorSkel.html');
	});


	app.use(express.static(__dirname + '/public'));
        recsApp.use(express.static(__dirname + '/recordings'));
        app.use('/recs', recsApp);
}
