// Save options
function saveOptions() {
    var fbUrl = document.getElementById('crfburl').value;
    var autoWork = document.getElementById('crautowork').checked;
    var workDelay = document.getElementById('crworkdelay').value;
    var confirmWorkingOn = document.getElementById('crconfirmworking').checked;
    var idleStopWork = document.getElementById('cridlestop').value;
    var resumeWorkAfterIdle = document.getElementById('cridleresume').value;
    var stopOnFbNonCaseUrl = document.getElementById('crstoponnoncase').checked;
    
    chrome.storage.sync.set({
        fbUrl: fbUrl,
        autoWork: autoWork,
        workOnDelay: workDelay,
        confirmWorkingOn: confirmWorkingOn,
        idleStopWork: idleStopWork,
        idleResumeWork: resumeWorkAfterIdle,
        stopOnFbNonCaseUrl: stopOnFbNonCaseUrl
    }, function() {
        var status = document.getElementById('status');

        if (idleStopWork > 0) {
            if (idleStopWork < 15) {
                idleStopWork = 15;
            }
          
            chrome.idle.setDetectionInterval(Number(idleStopWork));
        }

        status.textContent = 'Options saved.';

        setTimeout(function() {
          status.textContent = '';
        }, 2000);

    });
}

// Restore options
function restoreOptions() {
    // Load with defaults...
    chrome.storage.sync.get({
        fbUrl: 'https://centralreach.fogbugz.com',
        autoWork: true,
        workOnDelay: 5,
        confirmWorkingOn: true,
        idleStopWork: 300,
        idleResumeWork: true,
        stopOnFbNonCaseUrl: false,
        fbApiToken: '',
        crApiToken: ''
    }, function(items) {
        document.getElementById('crfburl').value = items.fbUrl;
        document.getElementById('crautowork').checked = items.autoWork;
        document.getElementById('crworkdelay').value = items.workOnDelay;
        document.getElementById('crconfirmworking').checked = items.confirmWorkingOn;
        document.getElementById('cridlestop').value = items.idleStopWork;
        document.getElementById('crstoponnoncase').checked = items.stopOnFbNonCaseUrl;
        document.getElementById('crfbapitoken').value = items.fbApiToken;
        document.getElementById('crcrapitoken').value = items.crApiToken;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
