
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

var defaultRecId = "2018_12_31__23_22_40";
var player = null;

function loadSessions()
{
    var sessionsURL = "/sessions";
    console.log("loadSessions ****** "+sessionsURL);
    $.getJSON(sessionsURL).done((data, status) => {
        console.log("sess data: "+JSON.stringify(data,null,2));
        var sessions = data.sessions;
        sessions.forEach(session => {
            let sessItem = $('<a>', {
                text: session,
                href: "#",
                click: () => player.setSession(session)
            }).appendTo("#sessionList");
            $('<br>').appendTo("#sessionList");
        });
    }).fail(() => {
    });
}

class Player {
    constructor(recId) {
        this.setSession(recId);
        var inst = this;
        setInterval(() => {inst.tick()}, 50);
    }

    setSession(recId) {
        console.log("setSession "+recId);
        $("#sessionName").html(recId+"...");
        this.recordingId = recId;
        this.frameType = "bmp";
        this.frameNum = 0;
        this.numFrames = 0;
        this.prevFrameNum = 0;
        this.bodyFrames = [];
        this.loadIndex();
        this.playing = false;
    }

    seekIdx(idx) {
        if (idx <= 0)
            idx = 1;
        if (idx >= this.numFrames)
            idx = this.numFrames;
        this.frameNum = idx;
        this.prevFrame = null;
    }
    
    loadIndex() {
        this.loading = true;
        this.frameNum = 0;
        this.loadIndex_();
    }
    
    loadIndex_() {
        this.frameNum++;
        var url = "/recs/"+this.recordingId+"/bodyFrame"+
            this.frameNum+".json";
        $("#stats").html("loading: "+url);
        var inst = this;
        var gp = $.getJSON(url, (data, status, jqXHR) => {
            //console.log("sucess...");
        }).done((data, status) => {
            //console.log("status: "+this.frameNum+" "+status);
            this.numFrames = this.frameNum;
            this.bodyFrames[this.frameNum] = data;
            inst.loadIndex_();
        }).fail(() => {
            console.log("failed ... finished loading index");
            this.loading = false;
            this.seekIdx(1);
            this.play();
            $("#sessionName").html(this.recordingId);
            inst.onSessionReady();
        });
    }

    onSessionReady() {
        var RHAND = 11;
//        bodyDrawer.drawTrail(this.bodyFrames, 0, RHAND);
    }
    
    play() {
        this.playing = true;
    }

    pause() {
        this.playing = false;
    }

    tick() {
        //console.log("tick...");
        if (this.loading)
            return;
        if (this.frameNum >= this.numFrames) {
            this.playing = false;
        }
        if (this.playing) {
            this.frameNum++;
        }
        if (this.frameNum != this.prevFrameNum) {
            var url = "/recs/"+this.recordingId+"/image"+
                           this.frameNum+"."+this.frameType;
            $("#stats").html("url: "+url);
            $("#img1").attr('src', url);
            this.prevFrameNum = this.frameNum;
        }
        var frame = this.bodyFrames[this.frameNum];
        if (frame) {
            lastBodyFrame = frame;
            //drawBodies(frame);
        }
    }
}

var bodyDrawer = null;

$(document).ready(()=> {
    console.log("************READY**********");
    var recId = getParameterByName("recId");
    bodyDrawer = new BodyDrawer();
    if (!recId)
        recId = defaultRecId;
    player = new Player(recId);
    $("#resetButton").click(() => { player.seekIdx(1); });
    $("#playButton").click(() => { player.play(); });
    $("#pauseButton").click(() => { player.pause(); });
//    $("#timeSlider").on('change', () => {
//        var val = $("#timeSlider").val();
//        console.log("slider change: "+val);
//    });
    $("#timeSlider").on('input', () => {
        var val = $("#timeSlider").val();
        console.log("slider: "+val);
        var rt = val/1000.0;
        var i = Math.round(rt*player.numFrames);
        player.seekIdx(i);
    });
    $("#img1").on('load', () => {
        //console.log("Image1 loaded ");
        var img = document.getElementById("img1");
        bodyDrawer.clearBackground(img);
        bodyDrawer.draw(lastBodyFrame, player);
    });
    loadSessions();
})
