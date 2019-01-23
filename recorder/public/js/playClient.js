
var defaultRecId = "2019_01_17__15_17_07";
defaultRecId = null;
var player = null;
var kinClient = null;

/*
in the saved JSON file there are lists of joints.  It is saved
as vector of joint objects, but the index into the vector is not
the jointType.  This replaces those vectors with sparse vectors
where the index of each joint object is the jointType.
*/
function fixFrame(frame)
{
    frame.bodies.forEach(body => {
        jvec = [];
        body.joints.forEach(joint => {
            jvec[joint.jointType] = joint;
        });
        body.joints = jvec;
    });
    return frame;
}

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
        this.currentImage = null;
        this.bodyDrawer = new BodyDrawer(this);
        this.pendingLoad = null;
        this.loadCollisions = 0; // times a new image is requested before old one loaded.
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
                    //inst.redraw();
                    inst.handlePose();
                };
            }
            else {
                this.kinClient.poseWatcher = null;
            }
        });
        setInterval(() => {inst.tick()}, 50);
    }

    handlePose() {
        //console.log("new pose");
        if (this.runTracker && this.kinClient) {
            this.bodyDrawer.handleLive(this.kinClient.lastBodyFrame);
        }
    }

    redraw() {
        this.bodyDrawer.resize()
        this.bodyDrawer.clearBackground(this.currentImage);
        this.bodyDrawer.draw(this.lastBodyFrame, player);
    }

    setSession(recId) {
        console.log("setSession "+recId);
        this.recordingId = recId;
        if (recId == null)
            return;
        $("#sessionName").html(recId+"...");
        $(document).attr('title', 'KVR '+recId);
        //this.frameType = "bmp";
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
        this.bodyFrames = [];
        var url = "/recs/"+this.recordingId+"/rec.json";
        $("#stats").html("loading: "+url);
        var inst = this;
        getJSON(url,
               (data) => {
                   inst.handleIndex(data);
               },
                () => {
                    alert("Failed to load index "+url);
                }
               );
    }

    handleIndex(data)
    {
        this.numFrames = data.numFrames;
        this.duration = data.duration;
        data.frames.forEach(frame => {
            frame = fixFrame(frame);
            this.bodyFrames[frame.frameNum] = frame;
        })
        this.loading = false;
        this.seekIdx(1);
        this.play();
        this.data = data;
    }

    loadIndexOLD() {
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
                }
               );
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
        if (this.recordingId == null)
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
            if (this.pendingLoad) {
                console.log("load collision");
                this.loadCollisions++;
            }
            else {
                this.newImage = new Image();
                this.pendingLoad = true;
                this.newImage.src = url;
                this.newImage.addEventListener('load', () => {
                    //console.log("newImage loaded");
                    this.currentImage = this.newImage;
                    this.pendingLoad = false;
                    this.redraw();
                });
            }
            this.prevFrameNum = this.frameNum;
        }
        var frame = this.bodyFrames[this.frameNum];
        if (frame) {
            this.lastBodyFrame = frame;
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
    $(window).resize(e => {
        //console.log("window.resize");
        player.redraw();
    });
})
