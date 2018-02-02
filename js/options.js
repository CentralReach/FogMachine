// Save options
function saveOptions() {
    var fbUrl = document.getElementById('crfburl').value;
    var ghUrl = document.getElementById('crghurl').value;
    var confUrl = document.getElementById('crconfurl').value;
    var autoWork = document.getElementById('crautowork').checked;
    var workDelay = document.getElementById('crworkdelay').value;
    var confirmWorkingOn = document.getElementById('crconfirmworking').checked;
    var idleStopWork = document.getElementById('cridlestop').value;
    var resumeWorkAfterIdle = document.getElementById('cridleresume').checked;
    var stopOnFbNonCaseUrl = document.getElementById('crstoponnoncase').checked;
    var crUrlCaseMap = document.getElementById('crurlmap').value;

    chrome.storage.sync.set({
        fbUrl: fbUrl,
        ghUrl: ghUrl,
        confUrl: confUrl,
        autoWork: autoWork,
        workOnDelay: workDelay,
        confirmWorkingOn: confirmWorkingOn,
        idleStopWork: idleStopWork,
        idleResumeWork: resumeWorkAfterIdle,
        stopOnFbNonCaseUrl: stopOnFbNonCaseUrl,
        crUrlCaseMap: crUrlCaseMap
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
        ghUrl: 'https://github.centralreach.com',
        confUrl: 'https://centralreach.highfive.com',
        autoWork: true,
        workOnDelay: 3,
        confirmWorkingOn: false,
        idleStopWork: 300,
        idleResumeWork: true,
        stopOnFbNonCaseUrl: false,
        fbApiToken: '',
        crApiToken: '',
        crUrlCaseMap: `{
"https://centralreach.highfive.com/engineering-tech-discussion": 41035,
"https://centralreach.highfive.com/daily-standup": 43447,
"https://centralreach.highfive.com/office": 41867
}`
    }, function(items) {
        document.getElementById('crfburl').value = items.fbUrl;
        document.getElementById('crghurl').value = items.ghUrl;
        document.getElementById('crconfurl').value = items.confUrl;
        document.getElementById('crautowork').checked = items.autoWork;
        document.getElementById('crworkdelay').value = items.workOnDelay;
        document.getElementById('crconfirmworking').checked = items.confirmWorkingOn;
        document.getElementById('cridlestop').value = items.idleStopWork;
        document.getElementById('cridleresume').checked = items.idleResumeWork;
        document.getElementById('crstoponnoncase').checked = items.stopOnFbNonCaseUrl;
        document.getElementById('crurlmap').value = items.crUrlCaseMap;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
