
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
