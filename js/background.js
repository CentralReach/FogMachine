chrome.storage.sync.get({
	idleStopWork: 300
}, function(s) {
	if (s.idleStopWork > 0) {
		chrome.idle.setDetectionInterval(Number(s.idleStopWork));
	}
});

chrome.idle.onStateChanged.addListener(function (state) {
	chrome.storage.sync.get({
		idleStopWork: 300,
		idleResumeWork: true
	}, function(s) {
		if (s.idleStopWork > 0) {
			if (state == 'active' && s.idleResumeWork) {
				// Cancel any outstanding will stop work...
				chrome.notifications.clear('crfbwillstopwork');

				// Restart work on the last active case
				chrome.storage.local.get({
					lastCaseNumber: '',
					currentlyWorkingOn: ''
				}, function(r) {
					if (r.lastCaseNumber && r.lastCaseNumber != r.currentlyWorkingOn) {
						console.log(`active state working on ${r.lastCaseNumber}`);
						doUpdateWorkingOn(r.lastCaseNumber, true, true);
					}
				});
			} else if (state == 'idle') {
				stopWorkingOn(`You have been idle for ${s.idleStopWork} seconds`);
			} else if (state == 'locked') {
				doStopWorkingOn(true);
			}
		}
	});
});

chrome.tabs.onActivated.addListener(function(info) {
	// If a tab is activated and remains active for the timeout, process it as potential case work
	var activatedTabId = info.tabId;

	setTimeout(function() {
		chrome.tabs.get(activatedTabId, function(tab) {
			// If the tab exists and it is still active in it's window...
			if (tab && tab.active) {
				processTab(tab);
			}
		});		
	}, 2500);

});

chrome.tabs.onUpdated.addListener(function(tabid, changeInfo, tab) {
	if (changeInfo.status === 'complete') {
		processTab(tab);
	}
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
	chrome.storage.local.get({
		lastCaseNumber: ''
	}, function(r) {
		// No need to look for the will stop work notifications here, if the starts any activity, we cancel that,
		// so there's no way to actually hit any buttons...
	    if (notificationId == r.lastCaseNumber) {
	    	// Does not matter what button they hit, they all clear the notification
	    	chrome.notifications.clear(notificationId, function(wasCleared) {
		        if (wasCleared && buttonIndex === 0) {
		        	// Hit ok button...
		        	doUpdateWorkingOn(r.lastCaseNumber, true);
		        }
		    });
	    }
	});
});

chrome.notifications.onClosed.addListener(function(notificationId, byUser) {
	// Close should clear, but to be safe on all versions...
	chrome.notifications.clear(notificationId);

	if (byUser && notificationId != 'crfbwillstopwork') {
		// Same as hitting ok for starting work
		doUpdateWorkingOn(notificationId, true);
	}
});

function isCaseNumber(element) {
	 return !isNaN(element) && isFinite(element);
}

function processTab(tab) {
	chrome.storage.sync.get({
	    autoWork: true,
	    workOnDelay: 5,
	    fbUrl: 'https://centralreach.fogbugz.com',
	    stopOnFbNonCaseUrl: false
	}, function(items) {
		if (!items.autoWork) {
			return;
		}
		if (tab.url.indexOf(items.fbUrl) < 0) {
			return;
		}

		var isCasesUrl = false;
		var newCaseNumber = '';
		var wait = (items.workOnDelay * 1000);

		var urlSegments = tab.url.split('/');

		urlSegments.forEach(function(e) {
			if (e) {
				if (isCasesUrl && !isNaN(e) && isFinite(e)) {
					newCaseNumber = e; 
				} 
				else if (e == 'cases') { 
					isCasesUrl = true; 
				} 
			} 
		});

		if (newCaseNumber) {
			
			chrome.storage.local.get({
				lastCaseNumber: ''
			}, function(r) {
				if (r.lastCaseNumber != newCaseNumber) {
					chrome.storage.local.set({
						lastCaseNumber: newCaseNumber
					});

					if (wait <= 0) {
						startUpdateWorkingOn(newCaseNumber);
					} else {
				    	setTimeout(function() {
				    		startUpdateWorkingOn(newCaseNumber);
				    	}, wait);
				    }
				}
			});
		} else if (items.stopOnFbNonCaseUrl) {
			stopWorkingOn("The 'Stop work when navigating to FogBugz non-case URL' option is on");
		}
    });	
}

function startUpdateWorkingOn(caseNumber) {
	// If this case is still the same one the user is viewing/last viewed since the delay started, update working on
	chrome.storage.local.get({
		lastCaseNumber: ''
	}, function(r) {
		if (r.lastCaseNumber == caseNumber) {
			// Notify that this is happening...
			chrome.notifications.create(caseNumber, {
				type: 'basic',
				iconUrl: 'images/notify.png',
				title: `Will work on ${caseNumber}`,
				message: `About to start working on case ${caseNumber}, cancel now if this is not desired.`,
				buttons: [{
					title: "Ok"
				}, {
		            title: "Cancel"
		        }]
			}, function(notificationId) {
				setTimeout(function() { 
					doUpdateWorkingOn(notificationId);
				}, 2500);
			});
		}
	});
}

function doUpdateWorkingOn(caseNumber, force, noConfirm) {
	if (!isCaseNumber(caseNumber)) {
		return;
	}

	chrome.notifications.clear(caseNumber, function(wasCleared) {
		if (force || wasCleared) {
			chrome.storage.local.set({
				currentlyWorkingOn: caseNumber
			});

			crApi.startWork('FogBugz', caseNumber)
				 .then(r => {
				 		if (noConfirm) {
				 			return Promise.resolve(false);
				 		} else {
				 			return new Promise(s => chrome.storage.local.get({
				 				confirmWorkingOn: true
				 			}, s));
				 		}
				 	})
				 .then(r => {
						if (r && r.confirmWorkingOn) {
							// Side effect async is fine here...just a confirm
							chrome.notifications.create(caseNumber + 'confirmed', {
								type: "basic",
								iconUrl: "images/notify.png",
								title: `Now working on case ${caseNumber}`,
								message: `Now working on case ${caseNumber}`,
								buttons: [{
						            title: "Ok"
						        }]
							}, function(notificationId) {
								setTimeout(function() {
									chrome.notifications.clear(notificationId);
								}, 2500);
							});
						}
						
						return true;
				 	})
				 .catch(x => {
					 	chrome.notifications.clear(caseNumber + 'failed', () => {
					 		chrome.notifications.create(caseNumber + 'failed', {
								type: 'basic',
								iconUrl: 'images/notify.png',
								title: `FAILED to start work on case ${caseNumber}`,
								message: `Could not successfully start work - [${x}]`,
								buttons: [{
						            title: 'Ok'
						        }]
							})
						});

				 		return false;
				 	});

		}
	});
}

function stopWorkingOn(because) {
	chrome.notifications.create('crfbwillstopwork', {
		type: "basic",
		iconUrl: "images/notify.png",
		title: 'Will stop work on all cases',
		message: `${because}, cancel now if this is not desired.`,
		buttons: [{
            title: "Ok"
        }, {
        	title: "Cancel"
        }]
	}, function(notificationId) {
		setTimeout(function() {
			doStopWorkingOn();
		}, 5500);
	});
}

function doStopWorkingOn(force) {
	chrome.notifications.clear('crfbwillstopwork', function(wasCleared) {
		if (force || wasCleared) {
			chrome.storage.local.set({
				currentlyWorkingOn: ''
			});

			crApi.stopWork('FogBugz')
				 .then(r => {
				 		return new Promise(s => chrome.storage.local.get({
				 				confirmWorkingOn: true
				 			}, s));
					})
				 .then(r => {
						if (r.confirmWorkingOn) {
							// Side effect async is fine here...just a confirm
							chrome.notifications.create('crfbdidstopwork', {
								type: 'basic',
								iconUrl: 'images/notify.png',
								title: 'Stopped work on all cases',
								message: 'Stopped work on all cases',
								buttons: [{
						            title: 'Ok'
						        }]
							}, function(notificationId) {
								setTimeout(function() {
									chrome.notifications.clear(notificationId);
								}, 2500);
							});
						}
						
						return true;
				 	})
				 .catch(x => {
				 		chrome.notifications.clear('crfbdidstopworkfail', () => {
					 		chrome.notifications.create('crfbdidstopworkfail', {
								type: 'basic',
								iconUrl: 'images/notify.png',
								title: 'FAILED to stopped work on all cases',
								message: `Could not successfully stop work - [${x}]`,
								buttons: [{
						            title: 'Ok'
						        }]
							})
						});

				 		return false;
					 });

		}
	});
}