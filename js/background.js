chrome.storage.sync.get(
  {
    idleStopWork: 300
  },
  function(s) {
    if (s.idleStopWork > 0) {
      chrome.idle.setDetectionInterval(Number(s.idleStopWork));
    }
  }
);

chrome.runtime.onMessage.addListener(function(request, sender, response) {
  switch (request.action) {
    case "crStopAllWork":
      doStopWork(true);
      break;
    case "crStartWorkOn":
      doUpdateWorkingOn(request.caseNumber, true, true);
      break;
    case "crStartWorkLast":
      startWorkOnLastAsync();
      break;
  }
  response();
});

window.addEventListener(
  "online",
  function(e) {
    startWorkOnLastAsync();
  },
  false
);

chrome.idle.onStateChanged.addListener(function(state) {
  chrome.storage.sync.get(
    {
      idleStopWork: 300,
      idleResumeWork: true
    },
    function(s) {
      if (s.idleStopWork > 0) {
        if (state == "active" && s.idleResumeWork) {
          // Cancel any outstanding will stop work...
          chrome.notifications.clear("crfbwillstopwork");

          // Resume work on the last active case if it is still open and what not
          startWorkOnLastAsync();
        } else if (state == "idle") {
          stopWorkingOn(`You have been idle for ${s.idleStopWork} seconds`);
        } else if (state == "locked") {
          doStopWorkingOn(true);
        }
      }
    }
  );
});

chrome.tabs.onActivated.addListener(function(info) {
  // If a tab is activated and remains active for the timeout, process it as potential case work
  var activatedTabId = info.tabId;

  setTimeout(function() {
    chrome.tabs.get(activatedTabId, function(tab) {
      if (chrome.runtime.lastError) {
        return;
      }

      // If the tab exists and it is still active in it's window...
      if (tab && tab.active) {
        processTab(tab);
      }
    });
  }, 750);
});

chrome.tabs.onUpdated.addListener(function(tabid, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab && tab.active) {
    processTab(tab);
  }
});

chrome.notifications.onButtonClicked.addListener(function(
  notificationId,
  buttonIndex
) {
  chrome.storage.local.get(
    {
      lastCaseNumber: ""
    },
    function(r) {
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
    }
  );
});

chrome.notifications.onClosed.addListener(function(notificationId, byUser) {
  // Close should clear, but to be safe on all versions...
  chrome.notifications.clear(notificationId);

  if (byUser && notificationId != "crfbwillstopwork") {
    // Same as hitting ok for starting work
    doUpdateWorkingOn(notificationId, true);
  }
});

function isCaseNumber(element) {
  return element && !isNaN(element) && isFinite(element) && element > 0;
}

function getCaseInfoFromUrls(tab, urls, callback) {
  if (!tab || !tab.url || !urls) {
    callback(
      tab,
      {
        caseNumber: "",
        isFbUrl: false,
        isGhUrl: false,
        isConfUrl: false,
        isStaticUrl: false
      },
      urls
    );

    return;
  }

  var url = tab.url;

  // First see if this url is statically mapped
  if (urls.crUrlCaseMap) {
    var mapObj = JSON.parse(urls.crUrlCaseMap);
    var urlMapCase = mapObj ? mapObj[url] : 0;

    if (isCaseNumber(urlMapCase)) {
      callback(
        tab,
        {
          caseNumber: urlMapCase.toString(),
          isFbUrl: false,
          isGhUrl: false,
          isConfUrl: false,
          isStaticUrl: true
        },
        urls
      );

      return;
    }
  }

  if (
    url.indexOf(urls.fbUrl) >= 0 ||
    url.replace("manuscript.com", "fogbugz.com").indexOf(urls.fbUrl) >= 0 ||
    url.replace("fogbugz.com", "manuscript.com").indexOf(urls.fbUrl) >= 0
  ) {
    // FB Url...process it and return case info...
    var caseInfo = {
      caseNumber: "",
      isFbUrl: false,
      isGhUrl: false,
      isConfUrl: false,
      isStaticUrl: false
    };

    caseInfo.isFbUrl = true;

    var isCasesUrl = false;
    var urlSegments = url.split("/");

    urlSegments.forEach(function(e) {
      if (e) {
        if (isCasesUrl && isCaseNumber(e)) {
          caseInfo.caseNumber = e;
        } else if (e == "cases") {
          isCasesUrl = true;
        }
      }
    });

    callback(tab, caseInfo, urls);
  } else if (url.indexOf(urls.ghUrl) >= 0) {
    // GH url, that is all we do for these...
    chrome.tabs.sendMessage(tab.id, { action: "crGetPrCommitRefs", fbUrl: urls.fbUrl }, function(
      ghPrCase
    ) {
      var ghCaseInfo = {
        caseNumber: "",
        isFbUrl: false,
        isGhUrl: true,
        isConfUrl: false,
        isStaticUrl: false
      };

      if (isCaseNumber(ghPrCase)) {
        ghCaseInfo.caseNumber = ghPrCase;
      }

      callback(tab, ghCaseInfo, urls);
    });
  } else if (url.indexOf(urls.confUrl) >= 0) {
    // Conf url
    var firstSegment = url
      .replace(urls.confUrl, "")
      .split("/")
      .find(function(e) {
        return e;
      });
    var confCaseNum = 0;

    if (firstSegment) {
      // Find basically a case number in the first segment
      var mrx = /[^0-9]*([0-9]+)[^0-9]*/;
      var cnMatch = mrx.exec(firstSegment);

      if (cnMatch && cnMatch[1]) {
        confCaseNum = cnMatch[1];
      }
    }

    callback(
      tab,
      {
        caseNumber: confCaseNum,
        isFbUrl: false,
        isGhUrl: false,
        isConfUrl: true,
        isStaticUrl: false
      },
      urls
    );
  } else {
    callback(
      tab,
      {
        caseNumber: "",
        isFbUrl: false,
        isGhUrl: false,
        isConfUrl: false,
        isStaticUrl: false
      },
      urls
    );
  }
}

function processTab(tab) {
  chrome.storage.sync.get(
    {
      autoWork: true,
      workOnDelay: 5,
      fbUrl: "https://centralreach.fogbugz.com",
      ghUrl: "https://github.centralreach.com",
      confUrl: "https://centralreach.highfive.com",
      stopOnFbNonCaseUrl: false,
      crUrlCaseMap: ""
    },
    function(items) {
      if (!items.autoWork) {
        return;
      }

      getCaseInfoFromUrls(tab, items, doProcessTab);
    }
  );
}

function doProcessTab(tab, caseInfo, items) {
  if (
    !tab ||
    !caseInfo ||
    (!caseInfo.isFbUrl &&
      !caseInfo.isGhUrl &&
      !caseInfo.isConfUrl &&
      !caseInfo.isStaticUrl)
  ) {
    return;
  }

  if (caseInfo.caseNumber) {
    var wait = items.workOnDelay * 1000;
    var tabId = tab.id;

    chrome.storage.local.get(
      {
        lastCaseNumber: ""
      },
      function(r) {
        if (r.lastCaseNumber != caseInfo.caseNumber) {
          chrome.storage.local.set({
            lastCaseNumber: caseInfo.caseNumber,
            lastCaseTabId: tabId
          });

          if (wait <= 0) {
            startUpdateWorkingOn(caseInfo.caseNumber);
          } else {
            setTimeout(function() {
              chrome.tabs.get(tabId, function(tab) {
                if (chrome.runtime.lastError || !tab) {
                  return;
                }

                startUpdateWorkingOn(caseInfo.caseNumber);
              });
            }, wait);
          }
        }
      }
    );
  } else if (caseInfo.isFbUrl && items.stopOnFbNonCaseUrl) {
    stopWorkingOn(
      "The 'Stop work when navigating to FogBugz non-case URL' option is on"
    );
  }
}

function startWorkOnLastAsync() {
  if (!navigator.onLine) {
    return;
  }

  // Restart work on the last active case if it is still open as it was when stopped
  chrome.storage.local.get(
    {
      lastCaseNumber: "",
      currentlyWorkingOn: "",
      lastCaseTabId: ""
    },
    function(r) {
      if (
        r.lastCaseNumber &&
        r.lastCaseTabId &&
        r.lastCaseNumber != r.currentlyWorkingOn
      ) {
        chrome.tabs.get(r.lastCaseTabId, function(tab) {
          if (chrome.runtime.lastError || !tab) {
            return;
          }

          chrome.storage.sync.get(
            {
              fbUrl: "https://centralreach.fogbugz.com",
              ghUrl: "https://github.centralreach.com",
              confUrl: "https://centralreach.highfive.com",
              crUrlCaseMap: "",
              lastCaseNumber: r.lastCaseNumber
            },
            function(si) {
              getCaseInfoFromUrls(tab, si, function(t, c, o) {
                if (c.caseNumber && c.caseNumber == o.lastCaseNumber) {
                  doUpdateWorkingOn(o.lastCaseNumber, true, true);
                }
              });
            }
          );
        });
      }
    }
  );
}

function startUpdateWorkingOn(caseNumber) {
  if (!navigator.onLine || !isCaseNumber(caseNumber)) {
    return;
  }

  // If this case is still the same one the user is viewing/last viewed since the delay started, update working on
  chrome.storage.local.get(
    {
      lastCaseNumber: "",
      currentlyWorkingOn: "",
      lastCaseTabId: ""
    },
    function(r) {
      if (
        r.lastCaseNumber &&
        r.lastCaseTabId &&
        r.lastCaseNumber != r.currentlyWorkingOn &&
        r.lastCaseNumber == caseNumber
      ) {
        // Notify that this is happening...
        chrome.notifications.create(
          caseNumber,
          {
            type: "basic",
            iconUrl: "images/notify.png",
            title: `Will work on ${caseNumber}`,
            message: `About to start working on case ${caseNumber}, cancel now if this is not desired.`,
            buttons: [
              {
                title: "Ok"
              },
              {
                title: "Cancel"
              }
            ]
          },
          function(notificationId) {
            setTimeout(function() {
              chrome.tabs.get(r.lastCaseTabId, function(tab) {
                if (chrome.runtime.lastError || !tab) {
                  chrome.notifications.clear(notificationId);
                  return;
                }

                chrome.storage.sync.get(
                  {
                    fbUrl: "https://centralreach.fogbugz.com",
                    ghUrl: "https://github.centralreach.com",
                    confUrl: "https://centralreach.highfive.com",
                    crUrlCaseMap: ""
                  },
                  function(si) {
                    getCaseInfoFromUrls(tab, si, function(t, c, o) {
                      if (c.caseNumber && c.caseNumber == notificationId) {
                        doUpdateWorkingOn(notificationId);
                      } else {
                        chrome.notifications.clear(notificationId);
                      }
                    });
                  }
                );
              });
            }, 2500);
          }
        );
      }
    }
  );
}

function doUpdateWorkingOn(caseNumber, force, noConfirm) {
  if (!isCaseNumber(caseNumber) || !navigator.onLine) {
    return;
  }

  chrome.notifications.clear(caseNumber, function(wasCleared) {
    if (force || wasCleared) {
      chrome.storage.local.set({
        currentlyWorkingOn: caseNumber
      });

      crApi
        .startWork("FogBugz", caseNumber)
        .then(r => {
          if (noConfirm) {
            return Promise.resolve(false);
          } else {
            return new Promise(s =>
              chrome.storage.local.get(
                {
                  confirmWorkingOn: true
                },
                s
              )
            );
          }
        })
        .then(r => {
          if (r && r.confirmWorkingOn) {
            // Side effect async is fine here...just a confirm
            chrome.notifications.create(
              caseNumber + "confirmed",
              {
                type: "basic",
                iconUrl: "images/notify.png",
                title: `Now working on case ${caseNumber}`,
                message: `Now working on case ${caseNumber}`,
                buttons: [
                  {
                    title: "Ok"
                  }
                ]
              },
              function(notificationId) {
                setTimeout(function() {
                  chrome.notifications.clear(notificationId);
                }, 2500);
              }
            );
          }

          return true;
        })
        .catch(x => {
          console.error(x);

          chrome.notifications.clear(caseNumber + "failed", () => {
            chrome.notifications.create(caseNumber + "failed", {
              type: "basic",
              iconUrl: "images/notify.png",
              title: `FAILED to start work on case ${caseNumber}`,
              message: `Could not successfully start work on case ${caseNumber}`,
              buttons: [
                {
                  title: "Ok"
                }
              ]
            });
          });

          return false;
        });
    }
  });
}

function stopWorkingOn(because) {
  if (!navigator.onLine) {
    return;
  }

  chrome.notifications.create(
    "crfbwillstopwork",
    {
      type: "basic",
      iconUrl: "images/notify.png",
      title: "Will stop work on all cases",
      message: `${because}, cancel now if this is not desired.`,
      buttons: [
        {
          title: "Ok"
        },
        {
          title: "Cancel"
        }
      ]
    },
    function(notificationId) {
      setTimeout(function() {
        doStopWorkingOn();
      }, 5500);
    }
  );
}

function doStopWorkingOn(force) {
  chrome.notifications.clear("crfbwillstopwork", function(wasCleared) {
    if (force || wasCleared) {
      doStopWork();
    }
  });
}

function doStopWork() {
  chrome.storage.local.set({
    currentlyWorkingOn: ""
  });

  if (!navigator.onLine) {
    return false;
  }

  crApi
    .stopWork("FogBugz")
    .then(r => {
      return new Promise(s =>
        chrome.storage.local.get(
          {
            confirmWorkingOn: true
          },
          s
        )
      );
    })
    .then(r => {
      if (r.confirmWorkingOn) {
        // Side effect async is fine here...just a confirm
        chrome.notifications.create(
          "crfbdidstopwork",
          {
            type: "basic",
            iconUrl: "images/notify.png",
            title: "Stopped work on all cases",
            message: "Stopped work on all cases",
            buttons: [
              {
                title: "Ok"
              }
            ]
          },
          function(notificationId) {
            setTimeout(function() {
              chrome.notifications.clear(notificationId);
            }, 2500);
          }
        );
      }

      return true;
    })
    .catch(x => {
      console.error(x);

      chrome.notifications.clear("crfbdidstopworkfail", () => {
        chrome.notifications.create("crfbdidstopworkfail", {
          type: "basic",
          iconUrl: "images/notify.png",
          title: "FAILED to stopped work on all cases",
          message: `Could not successfully stop work`,
          buttons: [
            {
              title: "Ok"
            }
          ]
        });
      });

      return false;
    });
}
