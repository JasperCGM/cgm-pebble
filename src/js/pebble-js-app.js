var TIME_5_MINS = 5 * 60 * 1000,
TIME_10_MINS = 10 * 60 * 1000,
TIME_15_MINS = 15 * 60 * 1000,
TIME_20_MINS = TIME_10_MINS * 2,
TIME_30_MINS = TIME_15_MINS * 2,
TIME_60_MINS = TIME_30_MINS * 2,
TIME_90_MINS = TIME_30_MINS * 3;

var lastAlert = [0,0];
var LastLowAlert = [0,0];
var LastLowFallingAlert = [0,0];
var LastHighAlert = [0,0];
var LastHighRiseAlert = [0,0];

var started = new Date( ).getTime( );
var counter = 1;
var endpointnum = 2;
var url = ["http://jasper4242.azurewebsites.net/pebble","http://Jasmine4242.azurewebsites.net/pebble"];
var person = ["Jasper", "Jasmine"];
var namenum = 0;

var DIRECTIONS = {
    'NONE': 0,
    'DoubleUp': 1,
    'SingleUp': 2,
    'FortyFiveUp': 3,
    'Flat': 4,
    'FortyFiveDown': 5,
    'SingleDown': 6,
    'DoubleDown': 7,
    'NOT COMPUTABLE': 8,
    'RATE OUT OF RANGE': 9
};

function directionToTrend(direction) {
    var trend = 8;
    if (direction in DIRECTIONS) {
        trend = DIRECTIONS[direction];
    }
    return trend;
}

function fetchCgmData(lastReadTime, lastBG) {
    
    var response, message;
    var opts = options( );
    if (!opts.endpoint) {
        message = {
        icon: 0,
        bg: '??',
        readtime: timeago(new Date().getTime() - started),
        alert: 0,
        time: formatDate(new Date()),
        delta: 'SETTINGS'
        };
        
        console.log("sending message", JSON.stringify(message));
        MessageQueue.sendAppMessage(message);
        return;
    }
    var req = new XMLHttpRequest();
    
    console.log('options', opts, opts.endpoint);
    if(endpointnum > 1){
        counter++;
        namenum = counter % endpointnum;
        console.log("namenum: " + namenum);
        req.open('GET', url[namenum], true);
        
    }else{
        req.open('GET', opts.endpoint, true);
    }
    
    req.onload = function(e) {
        
        console.log(req.readyState);
        if (req.readyState == 4) {
            console.log(req.status);
            if(req.status == 200) {
                console.log("status: " + req.status);
                response = JSON.parse(req.responseText);
                
                var bgs = response.bgs;
                if (bgs && bgs.length > 0) {
                    console.log('got bgs', JSON.stringify(bgs));

                    var now = new Date().getTime(),
                    sinceLastAlert = now - lastAlert[namenum],
                    sinceLastLowAlert = now - LastLowAlert[namenum],
                    sinceLastLowFallingAlert = now - LastLowFallingAlert[namenum],
                    sinceLastHighAlert = now - LastHighAlert[namenum],
                    sinceLastHighRiseAlert = now - LastHighRiseAlert[namenum],
                    hourNow = new Date().getHours(),
                    debugging = "no alarm",
                    alertValue = 0,currentBG = bgs[0].sgv,
                    currentBGDelta = bgs[0].bgdelta,
                    currentDirection = bgs[0].direction,
                    delta = (currentBGDelta > 0 ? '+' : '') + currentBGDelta + " mg/dL " + person[namenum],
                    readingtime = new Date(bgs[0].datetime).getTime(),
                    readago = now - readingtime;
                    
                    console.log("delta: " + delta);
                    console.log("now: " + now);
                    console.log("readingtime: " + readingtime);
                    console.log("readago: " + readago);
                    
                    if (currentBG < 60){
                        alertValue = 2;
                        debugging = "currentBG < 60";
                    } else if(currentBG < 90 && sinceLastLowAlert > TIME_20_MINS){
                        alertValue = 2;
                        LastLowAlert[namenum] = now;
                        debugging = "currentBG < 90";
                    }else if(currentBG < 180 && currentDirection == 'DoubleDown' && sinceLastLowFallingAlert > TIME_10_MINS){
                        alertValue = 2;
                        LastLowFallingAlert[namenum] = now;
                        debugging = "currentBG < 180 and DoubleDown";
                    }else if(currentBG > 180 && sinceLastHighAlert > TIME_90_MINS && hourNow > 8 && hourNow < 20){
                        alertValue = 3;
                        LastHighAlert[namenum] = now;
                        debugging = "currentBG > 180";
                    }else if(currentBG > 260 && sinceLastHighAlert > TIME_90_MINS){
                        alertValue = 3;
                        LastHighAlert[namenum] = now;
                        debugging = "currentBG > 260";
                    }else if(currentBG > 300 && currentDirection == 'Doubleup' && sinceLastHighRiseAlert > TIME_30_MINS){
                        alertValue = 3;
                        LastHighRiseAlert[namenum] = now;
                        debugging = "currentBG > 300";
                    }
                    
                                        
                    if (alertValue === 0 && readago > TIME_10_MINS && sinceLastAlert > TIME_15_MINS) {
                        alertValue = 1;
                        lastAlert[namenum] = now;
                        debugging = "No data";
                    }
                    
                    message = {
                    icon: directionToTrend(currentDirection),
                    bg: currentBG,
                    readtime: timeago(new Date().getTime() - (new Date(bgs[0].datetime).getTime())),
                    alert: alertValue,
                    time: formatDate(new Date()),
                    delta: delta
                    };
                    
                    console.log("message: " + JSON.stringify(message));
                    MessageQueue.sendAppMessage(message);
                    
                } else {
                    message = {
                    icon: 0,
                    bg: '???',
                    readtime: timeago(new Date().getTime() - (now)),
                    alert: 1,
                    time: formatDate(new Date()),
                    delta: 'offline'
                        
                    };
                    console.log("sending message", JSON.stringify(message));
                    MessageQueue.sendAppMessage(message);
                }
            }
        }
    };
    req.send(null);
}

function formatDate(date) {
    var minutes = date.getMinutes(),
    hours = date.getHours() || 12,
    meridiem = " PM",
    formatted;
    
    if (hours > 12)
        hours = hours - 12;
    else if (hours < 12)
        meridiem = " AM";
    
    if (minutes < 10)
        formatted = hours + ":0" + date.getMinutes() + meridiem;
    else
        formatted = hours + ":" + date.getMinutes() + meridiem;
    
    return formatted;
}

function timeago(offset) {
    var parts = {},
    MINUTE = 60 * 1000,
    HOUR = 3600 * 1000,
    DAY = 86400 * 1000,
    WEEK = 604800 * 1000;
    
    if (offset <= MINUTE)              parts = { lablel: 'now' };
    if (offset <= MINUTE * 2)          parts = { label: '1 min ago' };
    else if (offset < (MINUTE * 60))   parts = { value: Math.round(Math.abs(offset / MINUTE)), label: 'mins' };
    else if (offset < (HOUR * 2))      parts = { label: '1 hr ago' };
    else if (offset < (HOUR * 24))     parts = { value: Math.round(Math.abs(offset / HOUR)), label: 'hrs' };
    else if (offset < (DAY * 1))       parts = { label: '1 day ago' };
    else if (offset < (DAY * 7))       parts = { value: Math.round(Math.abs(offset / DAY)), label: 'day' };
    else if (offset < (WEEK * 52))     parts = { value: Math.round(Math.abs(offset / WEEK)), label: 'week' };
    else                               parts = { label: 'a long time ago' };
    
    if (parts.value)
        return parts.value + ' ' + parts.label + ' ago';
    else
        return parts.label;
    
}

function options ( ) {
    var opts = [ ].slice.call(arguments).pop( );
    console.log("opts line 184: " + opts);
    if (opts) {
        window.localStorage.setItem('cgmPebble', JSON.stringify(opts));
        console.log("JSON.stringify(opts): " + JSON.stringify(opts));
    } else {
        opts = JSON.parse(window.localStorage.getItem('cgmPebble'));
        console.log("opts line 190: " + opts);
    }
    return opts;
}

var MessageQueue = (function () {
                    
                    var RETRY_MAX = 5;
                    
                    var queue = [];
                    var sending = false;
                    var timer = null;
                    
                    return {
                    reset: reset,
                    sendAppMessage: sendAppMessage,
                    size: size
                    };
                    
                    function reset() {
                    queue = [];
                    sending = false;
                    }
                    
                    function sendAppMessage(message, ack, nack) {
                    
                    if (! isValidMessage(message)) {
                    return false;
                    }
                    
                    queue.push({
                               message: message,
                               ack: ack || null,
                               nack: nack || null,
                               attempts: 0
                               });
                    
                    setTimeout(function () {
                               sendNextMessage();
                               }, 1);
                    
                    return true;
                    }
                    
                    function size() {
                    return queue.length;
                    }
                    
                    function isValidMessage(message) {
                    // A message must be an object.
                    if (message !== Object(message)) {
                    return false;
                    }
                    var keys = Object.keys(message);
                    // A message must have at least one key.
                    if (! keys.length) {
                    return false;
                    }
                    for (var k = 0; k < keys.length; k += 1) {
                    var validKey = /^[0-9a-zA-Z-_]*$/.test(keys[k]);
                    if (! validKey) {
                    return false;
                    }
                    var value = message[keys[k]];
                    if (! validValue(value)) {
                    return false;
                    }
                    }
                    
                    return true;
                    
                    function validValue(value) {
                    switch (typeof(value)) {
                    case 'string':
                    return true;
                    case 'number':
                    return true;
                    case 'object':
                    if (toString.call(value) == '[object Array]') {
                    return true;
                    }
                    }
                    return false;
                    }
                    }
                    
                    function sendNextMessage() {
                    
                    if (sending) { return; }
                    var message = queue.shift();
                    if (! message) { return; }
                    
                    message.attempts += 1;
                    sending = true;
                    Pebble.sendAppMessage(message.message, ack, nack);
                    
                    timer = setTimeout(function () {
                                       timeout();
                                       }, 1000);
                    
                    function ack() {
                    clearTimeout(timer);
                    setTimeout(function () {
                               sending = false;
                               sendNextMessage();
                               }, 200);
                    if (message.ack) {
                    message.ack.apply(null, arguments);
                    }
                    }
                    
                    function nack() {
                    clearTimeout(timer);
                    if (message.attempts < RETRY_MAX) {
                    queue.unshift(message);
                    setTimeout(function () {
                               sending = false;
                               sendNextMessage();
                               }, 200 * message.attempts);
                    }
                    else {
                    if (message.nack) {
                    message.nack.apply(null, arguments);
                    }
                    }
                    }
                    
                    function timeout() {
                    setTimeout(function () {
                               sending = false;
                               sendNextMessage();
                               }, 1000);
                    if (message.ack) {
                    message.ack.apply(null, arguments);
                    }
                    }
                    
                    }
                    
                    }());

Pebble.addEventListener("ready",
                        function(e) {
                        console.log("connect: " + e.ready);
                        //fetchCgmData(0, 0);
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
                        console.log("Received message: " + JSON.stringify(e.payload));
                        fetchCgmData(e.payload.readtime, e.payload.bg);
                        });

Pebble.addEventListener("showConfiguration", function(e) {
                        console.log("showing configuration", JSON.stringify(e));
                        Pebble.openURL('http://bewest.github.io/cgm-pebble/configurable.html');
                        });

Pebble.addEventListener("webviewclosed", function(e) {
                        var opts = e.response.length > 5
                        ? JSON.parse(decodeURIComponent(e.response)): null;
                        
                        options(opts);
                        
                        });

