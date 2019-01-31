
var tracker = null;

class KinClient {
    constructor(socket) {
        var inst = this;
        this.poseWatcher = null;
        this.socket = socket || io.connect('/');
        this.socket.on('bodyFrame', frame => inst.handleBodyFrame(frame));
        //this.socket.on('stats', msg => inst.handleStats(msg));
    }

    handleBodyFrame(frame) {
        //console.log("frame", frame);
        this.lastBodyFrame = frame;
        if (this.poseWatcher)
            this.poseWatcher(frame);
    }
    
    handleStats(stats) {
        $("#stats").html(JSON.stringify(stats));
    }
}

