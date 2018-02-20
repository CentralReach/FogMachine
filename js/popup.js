document.addEventListener(
  "DOMContentLoaded",
  function() {
    const settingsButton = document.getElementById("crsettings");
    const authSettingsButton = document.getElementById("crauthsettings");
    const stopWorkButton = document.getElementById("crstopwork");
    const updateCredsLink = document.getElementById("updateCredsLink");
    const credentialsInputForm = document.getElementById(
      "credentialsInputForm"
    );
    const credentialsSaved = document.getElementById("credentialsSaved");
    const cancelCredsUpdate = document.getElementById("cancelCredsUpdate");
    const quickPicker = document.getElementById("quickPicker");
    const mostRecentCase = document.getElementById("mostRecentCase");
    var status = document.getElementById("status");

    let hasSetupCredentials = false;

    const startWorkOn = caseNumber => {
      chrome.runtime.sendMessage(
        { action: "crStartWorkOn", caseNumber: caseNumber.toString() },
        response => {
          updateStatus(`Started working on ${caseNumber}.`);
          updateLastCaseOption(caseNumber);
        }
      );
    };

    const updateStatus = message => {
      status.innerHTML = message;
      setTimeout(() => (status.innerHTML = ""), 5000);
    };

    const statusError = message => {
      updateStatus(
        `<span style="color: red; font-weigh: bold;">${message}</span>`
      );
    };

    stopWorkButton.addEventListener(
      "click",
      function() {
        chrome.runtime.sendMessage({ action: "crStopAllWork" }, function(
          response
        ) {
          updateStatus("Stopped work on all cases.");
        });
      },
      false
    );

    settingsButton.addEventListener(
      "click",
      function() {
        chrome.runtime.openOptionsPage();
      },
      false
    );

    authSettingsButton.addEventListener(
      "click",
      function() {
        var fbApiToken = document.getElementById("crfbapitoken").value;
        var crApiUser = document.getElementById("crcrapiuser").value;
        var crApiPw = document.getElementById("crcrapipw").value;

        if (crApiUser && crApiPw) {
          updateStatus("Authenticating...");
          crApi
            .authenticate(crApiUser, crApiPw)
            .then(ar => {
              if (fbApiToken) {
                return crApi.setExternalCredentials(fbApiToken, "FogBugz");
              } else {
                return {
                  Result: "Ok",
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

              updateStatus("Credentials saved.");
              toggleCredentialsForm(false);

              return true;
            })
            .catch(x => {
              statusError(
                `Error trying to authenticate and/or store tokens - [${x}]</span>`
              );
              console.error(x);
              return false;
            });
        } else {
          statusError(
            "Cannot update credentials - you must enter at least a CrApi user and password."
          );
        }
      },
      false
    );

    updateCredsLink.addEventListener("click", () => {
      toggleCredentialsForm(true);
    });

    cancelCredsUpdate.addEventListener("click", () => {
      toggleCredentialsForm(false);
    });

    const toggleCredentialsForm = showForm => {
      credentialsInputForm.style.display = showForm ? "initial" : "none";
      credentialsSaved.style.display = showForm ? "none" : "initial";
      cancelCredsUpdate.style.display = hasSetupCredentials
        ? "initial"
        : "none";
    };

    const updateLastCaseOption = (caseNumber = null) => {
      const updateOption = lastCaseNumber => {
        lastCaseNumber = Number.parseInt(lastCaseNumber);
        if (Number.isNaN(lastCaseNumber)) {
          mostRecentCase.style.display = "none";
        } else {
          mostRecentCase.value = lastCaseNumber;
          mostRecentCase.innerHTML = `Most Recent (${lastCaseNumber})`;
          mostRecentCase.style.display = "initial";
        }
      };

      if (caseNumber) {
        updateOption(caseNumber);
      } else {
        chrome.storage.local.get(
          {
            lastCaseNumber: ""
          },
          response => {
            updateOption(response.lastCaseNumber);
          }
        );
      }
    };

    let quickPickOptions = [
      { display: "Daily Standup", caseNumber: 43447 },
      { display: "Techin/Discussions", caseNumber: 41954 },
      { display: "James 1-1", caseNumber: 40985 },
      { display: "Reach and Teach", caseNumber: 41867 },
      { display: "Engineering Weekly", caseNumber: 41035 },
      { display: "QA Handover", caseNumber: 44141 },
      { display: "Tooling/Setup/Upgrades", caseNumber: 41989 }
    ];

    // page init
    try {
      chrome.storage.local.get({ fbApiToken: "" }, t => {
        if (t && t.fbApiToken) {
          // we have credentials stored
          hasSetupCredentials = true;
          toggleCredentialsForm(false);
        }
      });

      quickPickOptions.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.caseNumber;
        opt.innerHTML = item.display;
        quickPicker.appendChild(opt);
      });

      quickPicker.addEventListener("change", e => {
        const selected =
            e.target.selectedOptions && e.target.selectedOptions[0],
          selectedCase = Number.parseInt(selected.value);
        if (!Number.isNaN(selectedCase) && selectedCase > 0) {
          startWorkOn(selectedCase);
          e.target.selectedIndex = 0;
        }
      });

      updateLastCaseOption();
    } catch (e) {
      console.error("Problem initializing FogMachine popup.", e);
    }
  },
  false
);
