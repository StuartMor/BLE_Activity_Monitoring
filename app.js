var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();
var motionID = null;
var fileObject;

//event fires when app is fully loaded
document.addEventListener("deviceready", deviceReady, false);
//device APIs are available
function deviceReady() {
    deviceReadyDeferred.resolve();

    //----------------------------- File I/O ------------------------------------------------

    //create file to hold accelerometer data
    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(directory) {
        //output directory path to console
        console.log("Retrieved main directory:", directory);
        console.log("Creating new file");
        directory.getFile("accelerometerValues.csv", {
            create: true
        }, function(file) {
            console.log("File created", file);
            fileObject = file;
        });
    });
}

$(document).on("mobileinit", function() {
    jqmReadyDeferred.resolve();
});

$.when(deviceReadyDeferred, jqmReadyDeferred).then(init);

//---------------------------- Setup any needed actions -----------------------------------------
function init() {

    //get accelerometer snapshot
    $(document).on("touchend", "#showMotion", function(e) {
        e.preventDefault();
        //get static readings of accelerometer values
        accelerometerSnapshot();
    });

    //start live accelerometer readings
    $(document).on("touchend", "#start", function(e) {
        e.preventDefault();
        //start accelerometer
        accelerometerStart();
    });

    //stop accelerometer readings
    $(document).on("touchend", "#stop", function(e) {
        //stop accelerometer
        accelerometerStop();
    });


    //bluetooth scan
    $(document).on("touchend", "#beaconInfo", function(e) {
        e.preventDefault();
        beaconInfo();
        //gotResults();
    });
}

//----------------------------- Accelerometer ------------------------------------------------

function accelerometerSnapshot() {
    navigator.accelerometer.getCurrentAcceleration(
        gotMotion, onMotionError);
}

function accelerometerStart() {
    //refresh rate measured in ms
    var refreshRate = {
        frequency: 50
    };
    //create new ID and start accelerometer
    motionID = navigator.accelerometer.watchAcceleration(
        gotMotion, onMotionError, refreshRate);
}

function accelerometerStop() {
    //uses null value from watch ID to stop watchAccl func
    navigator.accelerometer.clearWatch(motionID);
}

//accelerometer error parameter
function onMotionError(e) {
    $("#motionData").html("Error! " + e.toString());
}

//display axis values on screen in motionData div
function gotMotion(accelerometer) {

    var s = "";
    s += "X Motion: " + accelerometer.x.toFixed(3) + " m/s" + "<br/>";
    s += "Y Motion: " + accelerometer.y.toFixed(3) + " m/s" + "<br/>";
    s += "Z Motion: " + accelerometer.z.toFixed(3) + " m/s" + "<br/>";
    s += "Timestamp: " + accelerometer.timestamp;
    $("#motionData").html(s);

    //if the file doesn't exist return
    if (!fileObject) return;
    fileObject.createWriter(function(fileWriter) {
        fileWriter.seek(fileWriter.length);
        fileWriter.write(
            accelerometer.x.toFixed(3) + "," +
            accelerometer.y.toFixed(3) + "," +
            accelerometer.z.toFixed(3) + "," +
            accelerometer.timestamp + "\n");
        console.log("File written to storage");
    });
}
//--------------------------------------------------------
function beaconInfo() {
    var distance;
    var region = {
        identifier: 'MyRegion'
    };

    estimote.beacons.startRangingBeaconsInRegion(
        region,
        onBeaconsRanged,
        onError);
}

function onBeaconsRanged(beaconInfo) {
    // Sort beacons by distance.
    beaconInfo.beacons.sort(function(beacon1, beacon2) {
        return beacon1.distance > beacon2.distance
    });

    // Log distance for the closest beacon.
    var beacon = beaconInfo.beacons[0];
    var distanceAway = ('Distance ' + beacon.distance.toFixed(3) + 'm away');
    $("#scanResults").html(distanceAway);

    if (beacon.distance < 0.5) {

        $("#proximity").html("Getting Close");
    }
}

function onError(error) {
    console.log('Start ranging error: ' + error);
}


//------------------------------ Write to file ----------------------------------------------------
/*
Original Working Function

function writeLog(str) {
    //if file doesn't exist return
    if (!fileOb) return;
    var dataToWrite = str + " [" + (new Date()) + "]\n";
    fileOb.createWriter(function(fileWriter) {
        fileWriter.seek(fileWriter.length);
        fileWriter.write(dataToWrite);
        console.log("File written to storage");
    });
}
*/