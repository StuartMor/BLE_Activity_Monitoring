/* Global Vars */

/*  Ensures both Cordova and JQuery have successfully loaded */
var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();
/* Instantiate File object to be used by Cordova file-writer plugin */
var fileObject;
/* Motion ID used by start and stop accelerometer functions */
var motionID;
/* Motion ID does not clear if called multiple times, ensures single press */
var motionIDCount = 0;
/* Initial accelerometer state */
var accelerometerIsRunning = false;
/* Instantiate beacon object */
var beacons = {};

/*======================================
=            Cordova Events            =
======================================*/


document.addEventListener('deviceready', deviceReady, false);

/* App loaded successfully, deviceReady event fires */
function deviceReady() {
    deviceReadyDeferred.resolve();

    /* Handle onPause and onResume events should they be implemented */
    document.addEventListener('pause', onPause, false);
    document.addEventListener('resume', onResume, false);

    /* Create file to ensure data can be recorded */
    //createFile();

    /* Retrieve details of nearby beacons */
    createFile();
    scanForBeacons();
}

function onPause() {

    /* Application has been suspended. Save application state if needed */
    startAccelerometer();
}

function onResume() {

    /* Application has been reactivated. Restore application state here */
    startAccelerometer();
}

/* Resolve deferred object */

$(document).on("mobileinit", function() {
    jqmReadyDeferred.resolve();
});

/*
    At present below halts application, needs investigation
    is supposedly ideal way to work with jquery and Cordova
    ensures both have loaded successfully
 */

/* $.when(deviceReadyDeferred, jqmReadyDeferred).then(init); */


$(document).on("touchend", "#startAccelerometer", function(e) {
    e.preventDefault();

    /* Start accelerometer and assign MotionID */
    accelerometerIsRunning = true;
    startAccelerometer();
});

//
$(document).on("touchend", "#stopAccelerometer", function(e) {
    e.preventDefault();

    /* Clear Motion ID and stop accelerometer */
    stopAcclererometer();
});

$(document).on("touchend", "#uploadFile", function(e) {
    e.preventDefault();

    /* Uploads file when pressed */
    uploadFile();
});

$(document).on("touchend", "#getLocation", function(e) {
    e.preventDefault();

    getPosition();

});

/*=====  End of Cordova Event Code  ======*/


/*================================
=            File I/O            =
================================*/

function createFile() {
    /**
     * Using standard dataDirectory does not result in file being created
     * externalDataDirectory does work however with the test device Galaxy Note 3
     */

    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(directory) {

        /* Write directory to console, test purposes only */

        console.log("Retrieved main directory:", directory);
        console.log("Creating new file");

        /* create csv file and assign it to fileObject var */

        directory.getFile("accel.csv", {
            create: true,
            exclusive: false
        }, function(file) {
            console.log("File created", file);
            fileObject = file;
        });
        //console.log("successfully created file");
    });
}

function uploadFile() {

    function success(r) {
        console.log("Message from server = " + r.responseCode);
        console.log("Response  = " + r.response);
        console.log("Sent = " + r.bytesSent + "bytes");
    }

    function fail(error) {
        console.log("An error has occurred: Code = " + error.code);
        console.log("upload error source " + error.source);
        console.log("upload error target " + error.target);
    }

    /* Destination of file */
    var url = encodeURI("http://192.168.1.241/cordovaproject/upload.php");
    var fileURI = "file:///storage/emulated/0/Android/data/com.DT080BProject/files/accel.csv";
    var options = new FileUploadOptions();
    options.fileKey = "file";
    options.fileName = fileURI.substr(fileURI.lastIndexOf('/') + 1);
    options.mimeType = "text/csv";
    var params = new Object();
    params.fileName = options.fileName;
    options.params = params;
    var ft = new FileTransfer();
    ft.upload(fileURI, url, success, fail, options);
}

/*=====  End of File I/O  ======*/

/*===================================
=            Geolocation            =
===================================*/
function getPosition() {
    /**
    
        TODO:
        - May give better experience https://www.npmjs.com/package/cordova-background-geolocation-lt

     */

    var options = {
        enableHighAccuracy: true,
        maximumAge: 3000000
    };

    var watchID = navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    function onSuccess(position) {

        navigator.notification.alert(
            "Latitude: " + position.coords.latitude + "\n" +
            "Longitude: " + position.coords.longitude + "\n",
            "Location",
            "Got it"
        );
    }

    function onError(error) {
        alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
    }
}

/*=====  End of Geolocation  ======*/

/*==========================================================
=            Device Accelerometer functionality            =
==========================================================*/

function startAccelerometer() {

    /* Let app know accelerometer is recording info */
    if (accelerometerIsRunning === true) {
        /* retrieves acceletometer sensor info 20 times per second */
        var refreshRate = {
            frequency: 50
        };

        /* Ensures startAcceleromter is not called more than once
         * stopAccelerometer() does not work if called twice
         */

        if (motionIDCount > 0) {
            /* if startAccelerometer has been pressed return */
            return;

            /* otherwise retrieve sensor info */
        } else if (motionIDCount === 0) {

            /* MotionID returns regular sensor info */
            motionID = navigator.accelerometer.watchAcceleration(
                gotMotion,
                onMotionError,
                refreshRate);

            motionIDCount++;
        }
    }
}

function stopAcclererometer() {

    navigator.accelerometer.clearWatch(motionID);
    /* Resetting ensure accelerometer can be started again */
    accelerometerIsRunning = false;
    motionIDCount = 0;
    /* Empty the acclData div of all results */
    $("#acclData").empty();
}

/**
 * MotionID success callback
 * Outputs accelerometer info to screen and writes to file
 */


function gotMotion(accelerometer) {

    var axisVal = "";
    axisVal += "X: " + accelerometer.x.toFixed(3) + " m/s" + " ";
    axisVal += "Y: " + accelerometer.y.toFixed(3) + " m/s" + " ";
    axisVal += "Z: " + accelerometer.z.toFixed(3) + " m/s";

    /* Output sensor info to acclData div */
    $("#acclData").html(axisVal);

    var theDate = new Date(accelerometer.timestamp);
    var currentTime = theDate.toLocaleTimeString();
    //if the fileObject doesn't exist return
    if (!fileObject) return;

    fileObject.createWriter(function(fileWriter) {
        /* Append new entries */
        fileWriter.seek(fileWriter.length);
        fileWriter.write(
            /* Round off to nearest 3 dec places */
            accelerometer.x.toFixed(3) + "," +
            accelerometer.y.toFixed(3) + "," +
            accelerometer.z.toFixed(3) + "," +
            currentTime + "\n");
        console.log("File written to storage");
    });
}

/* If there is an error, show it in an alert */
function onMotionError(error) {
    navigator.notification.alert(error.toString);
}
/*=====  End of Accelerometer functionality  ======*/

/*============================================================
=            Estimote Plugin Beacon functionality            =
============================================================*/
function scanForBeacons() {

    estimote.beacons.startRangingBeaconsInRegion({}, onBeaconsRanged, onError);

    function onBeaconsRanged(beaconInfo) {

        /* Create beacon object */
        var beacon = beaconInfo.beacons[0];
        var proximity = beacon.proximity;
        var proximityNames = [
            'Unknown',
            'Immediate',
            'Near',
            'Far'
        ];

        var meters = beacon.distance;
        var distance =
            (meters > 1) ?
            meters.toFixed(3) + ' m' :
            (meters * 100).toFixed(3) + ' cm';

        /* Sort beacons by distance */
        beaconInfo.beacons.sort(function(beacon1, beacon2) {
            return beacon1.distance > beacon2.distance;
        });

        var element = $(
            '<li>' + "Major: " + beacon.major + "<br>" + "Minor:" + beacon.minor + "<br>" + "Proximity: " + proximityNames[proximity] + "<br>" + "Distance: " + distance + "<br>" + 'RSSI: ' + beacon.rssi + '<br>' + '</li>'
        );

        if (meters < 0.3) {
            startAccelerometer();
        } else if (meters > 0.3) {
            stopAcclererometer();
        }

        $("#beaconsFound").html(element);
    }

    function onError(error) {
        console.log('Woops !  ' + error);
    }
}


/*=====  End of Beacon functionality  ======*/

/*===================================================
=            Device Sensor Functionality            =
===================================================*/


/*=====  End of Device Sensor Functionality  ======*/