document.addEventListener('DOMContentLoaded', function() {
	var settingsButton = document.getElementById('crsettings');
	var authSettingsButton = document.getElementById('crauthsettings');
	var stopWorkButton = document.getElementById('crstopwork');
	var startWorkLastButton = document.getElementById('crstartworklast');

	stopWorkButton.addEventListener('click', function() {
		chrome.runtime.sendMessage({ action: 'crStopAllWork'}, function(response) {
			var workstatus = document.getElementById('crstartstopworkstatus');
			workstatus.textContent = 'Stopping work on all cases';
		});
	}, false);
	
	startWorkLastButton.addEventListener('click', function() {
		chrome.runtime.sendMessage({ action: 'crStartWorkLast'}, function(response) {
			var workstatus = document.getElementById('crstartstopworkstatus');
			workstatus.textContent = 'Resuming work on previous case';
		});
	}, false);

	settingsButton.addEventListener('click', function() {
		chrome.runtime.openOptionsPage();
	}, false);

	authSettingsButton.addEventListener('click', function() {
		var fbApiToken = document.getElementById('crfbapitoken').value;
	    var crApiUser = document.getElementById('crcrapiuser').value;
		var crApiPw = document.getElementById('crcrapipw').value;
		var credstatus = document.getElementById('crsavecredsstatus');

		if (crApiUser && crApiPw) {
			crApi.authenticate(crApiUser, crApiPw)
				.then(ar => {
						if (fbApiToken) {
							return crApi.setExternalCredentials(fbApiToken, 'FogBugz');
						} else {
							return {
								Result: 'Ok',
								Failed: false
							};
						}
					})
				.then(r => {
						if (fbApiToken) {
							chrome.storage.local.set({
								fbApiToken: fbApiToken
							});
						}
						
						credstatus.textContent = 'Credentials saved.';

						return true;
					})
				.catch(x => {
						credstatus.textContent = `Error trying to authenticate and/or store tokens - [${x}]`;
						console.error(x);
						return false;
					});
			

		} else {			
			credstatus.textContent = 'Cannot update credentials - you must enter at least a CrApi user and pw.';
		}
		
	}, false);

	
}, false);
