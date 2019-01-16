
var defaultRecId = "2018_12_31__23_22_40";
var player = null;
var kinClient = null;

function getJSON(url, handler, errFun)
{
    console.log("getJSON: "+url);
    $.ajax({
        url: url,
        dataType: 'text',
        success: function(str) {
            var data;
            try {
                data = JSON.parse(str);
            }
            catch (err) {
                console.log("err: "+err);
                alert("Error in json for: "+url+"\n"+err);
                errFun();
                return;
            }
            handler(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Failed to get JSON for "+url);
            errFun();
        }
    });
}

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
        this.bodyDrawer = new BodyDrawer(this);
        var vj = {};
        vj[RHAND] = true;
        vj[LHAND] = true;
        this.bodyDrawer.setVisibleJoints(vj);
        this.kinClient = null;
        this.runTracker = false;
        $("#runTracker").click(() => {
            this.runTracker = $("#runTracker").is(':checked');
            console.log("runTracker click "+this.runTracker);
            if (!this.kinClient) {
                console.log("Getting KinClient");
                this.kinClient = new KinClient();
            }
            if (this.runTracker) {
                this.kinClient.poseWatcher = () => {
                    //console.log("new pose");
                    inst.redraw();
                };
            }
            else {
                this.kinClient.poseWatcher = null;
            }
        });
        $("#img1").on('load', () => {
            //console.log("image loaded");
            inst.redraw();
        })
        setInterval(() => {inst.tick()}, 50);
    }

    redraw() {
        //console.log("Image1 loaded ");
        var img = document.getElementById("img1");
        this.bodyDrawer.clearBackground(img);
        this.bodyDrawer.draw(this.lastBodyFrame, player);
        if (this.runTracker && this.kinClient) {
            this.bodyDrawer.handleLive(this.kinClient.lastBodyFrame);
        }
    }

    setSession(recId) {
        console.log("setSession "+recId);
        $("#sessionName").html(recId+"...");
        this.recordingId = recId;
        this.frameType = "bmp";
        this.frameType = "jpg";
        this.frameNum = 0;
        this.numFrames = 0;
        this.prevFrameNum = 0;
        this.framesPerSec = 30.0;
        this.bodyFrames = [];
        this.loadIndex();
        this.playing = false;
    }

    seekIdx_(idx) {
        if (idx <= 0)
            idx = 1;
        if (idx >= this.numFrames)
            idx = this.numFrames;
        this.frameNum = idx;
        this.prevFrame = null;
    }
    
    seekIdx(idx) {
        this.seekIdx_(idx);
    }

    getCurrentIdx() {
        return this.frameNum;
    }

    getCurrentTime() {
        return this.frameNum / this.framesPerSec;
    }
    
    showTime() {
        if (this.bodyFrames.length == 0)
            return;
        var v = this.frameNum * 1000 / this.bodyFrames.length;
        $("#timeSlider").val(v);
        $("#time").html(sprintf("%.2f", this.getCurrentTime()));
    }

    loadIndex() {
        this.loading = true;
        this.frameNum = 0;
        this.loadIndex_();
    }
    
    loadIndex_OLD() {
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

    loadIndex_() {
        this.frameNum++;
        var url = "/recs/"+this.recordingId+"/bodyFrame"+
            this.frameNum+".json";
        $("#stats").html("loading: "+url);
        var inst = this;
        getJSON(url,
               (data) => {
                   //console.log("status: "+this.frameNum+" "+status);
                   this.numFrames = this.frameNum;
                   this.bodyFrames[this.frameNum] = data;
                   inst.loadIndex_();
               },
                () => {
                    console.log("failed ... finished loading index");
                    this.loading = false;
                    this.seekIdx(1);
                    this.play();
                    $("#sessionName").html(this.recordingId);
                    inst.onSessionReady();
                }
               );
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
            this.lastBodyFrame = frame;
            //drawBodies(frame);
        }
        this.showTime();
    }
}

//var bodyDrawer = null;

$(document).ready(()=> {
    console.log("************READY**********");
    var recId = getParameterByName("recId");
    //bodyDrawer = new BodyDrawer();
    if (!recId)
        recId = defaultRecId;
    player = new Player(recId);
    $("#resetButton").click(() => { player.seekIdx(1); });
    $("#playButton").click(() => { player.play(); });
    $("#pauseButton").click(() => { player.pause(); });
    $("#timeSlider").on('input', () => {
        var val = $("#timeSlider").val();
        // console.log("slider: "+val);
        var rt = val/1000.0;
        var i = Math.round(rt*player.numFrames);
        player.seekIdx(i);
    });
    loadSessions();
})
