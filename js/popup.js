document.addEventListener('DOMContentLoaded', function() {
	var settingsButton = document.getElementById('crsettings');
	var authSettingsButton = document.getElementById('crauthsettings');
	var stopWorkButton = document.getElementById('crstopwork');
	var startWorkLastButton = document.getElementById('crstartworklast');

	stopWorkButton.addEventListener('click', function() {
		chrome.runtime.sendMessage({ action: 'crStopAllWork'}, function(response) {
			var workstatus = document.getElementById('crstartstopworkstatus');
			workstatus.textContent = response.success ? 'Stopped work successfully' : 'Error trying to stop work';
		});
	}, false);
	
	startWorkLastButton.addEventListener('click', function() {
		chrome.runtime.sendMessage({ action: 'crStartWorkLast'}, function(response) {
			var workstatus = document.getElementById('crstartstopworkstatus');
			workstatus.textContent = 'Attempting to resume work on previous case';
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

		if (fbApiToken && crApiUser && crApiPw) {
			crApi.authenticate(crApiUser, crApiPw)
				.then(ar => {
						return crApi.setExternalCredentials(fbApiToken, 'FogBugz');
					})
				.then(function(r) {
						chrome.storage.local.set({
							fbApiToken: fbApiToken
						});
						
						credstatus.textContent = 'Credentials saved.';

						return true;
					})
				.catch(x => {
						credstatus.textContent = `Error trying to authenticate and store tokens - [${x}]`;
						return false;
					});
			

		} else {			
			credstatus.textContent = 'Cannot update credentials - you must enter all 3 of above.';
		}
		
	}, false);

	
}, false);
