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

    let hasSetupCredentials = false;

    const startWork = caseNumber => {
      chrome.runtime.sendMessage({ action: "crStartWorkLast" }, function(
        response
      ) {
        var workstatus = document.getElementById("crstartstopworkstatus");
        workstatus.textContent = "Resuming work on previous case";
      });
    };

    stopWorkButton.addEventListener(
      "click",
      function() {
        chrome.runtime.sendMessage({ action: "crStopAllWork" }, function(
          response
        ) {
          var workstatus = document.getElementById("crstartstopworkstatus");
          workstatus.textContent = "Stopping work on all cases";
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
        var credstatus = document.getElementById("crsavecredsstatus");

        if (crApiUser && crApiPw) {
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

              credstatus.textContent = "Credentials saved.";

              return true;
            })
            .catch(x => {
              credstatus.textContent = `Error trying to authenticate and/or store tokens - [${x}]`;
              console.error(x);
              return false;
            });
        } else {
          credstatus.textContent =
            "Cannot update credentials - you must enter at least a CrApi user and pw.";
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
        if (t) {
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
        const selected = e.target.value;
      });
    } catch (e) {
      console.error("Problem initializing FogMachine popup.", e);
    }
  },
  false
);
