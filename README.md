FogMachine
==============================

## [|](#installing) Installing

Currently this is not in the chrome extension store (soon maybe).  Just clone the repo for now and load it as an upacked extension in chrome if desired (we're all developers anyhow, right?).  

See the following for help:

https://developer.chrome.com/extensions/getstarted#unpacked

After installing:
1. Set the [options](#options) you prefer
2. Enter your [FogBugz and API credentials](#popup)
3. All done - stop using the FogBugz built-in working timers

## [|](#how-it-works) How it works

The basic premise is to automatically manage what you are and are not working on for FogBugz cases simply by doing so for you as you open and/or view various cases in your browser.  Additionally it integrates with new services on CentralReach's server-side API to interact with the FogBugz API instead of doing so directly from the extension.  Why you ask?

* The FogBugz API is...let's just say it's not the snappiest
* The FogBugz API is...let's just say it isn't around all the time
* We include logic in our services to handle the FB Api being unavailable (and resending and syncronizing times when it does start responding), save and allow the option of reprocessing things that may be invalid and/or not accepted by the FB Api later, etc.
* This also allows us the ability to later integrate with other systems direclty as cases are worked on (or in the future commented, changed, etc.), i.e. our CentralReach task/pm platform, or some other platform.
* It lets us start building the framework for a JavaScript CentralReach API SDK at the same time...

Depending on how you've configured your options, it will currently:

### [Start work automatically](#how-start-work)

If you have the [auto work on viewed cases](#options-autowork) option on and you view a case for your configured [FogBugz URL](#fb-url) it will:

1. Optionally wait for a configured delay before starting work on the case (see the [auto work delay](#autowork-delay)) option
2. Notify you that it is about to start work on a given case (for about 2-3 seconds, not currently configurable) giving you the option to cancel or allow immediately (i.e. ok or cancel)
3. Start work on that case via the CentralReach API
4. Optionally confirm notify (see the [notify on start/stop](#notify-start-stop) option) you that you have started work on the given case

### [Stop work automatically](#how-stop-work)

If you have the [stop work after idle](#options-stop-idle-after) option set > 0, once your computer has been idle for that number of seconds it will:

1. Notify you that it is about to stop work on all cases (for about 5-6 seconds, not currently configurable) giving you the option to cancel (you cannot allow immediately, i.e. ok, because as soon as the extension senses computer activity it will cancel this)
2. Stop work on all cases via the CentralReach API
3. Optionally confirm notify (see the [notify on start/stop](#notify-start-stop) option) you that you have stopped work on all cases

If you have the [stop work after idle](#options-stop-idle-after) option set > 0, and your computer goes to sleep/hibernates/etc:

1. This works basically identical to the above without the initial warning notification (#1 from above), which would be kind of pointless while your computer is asleep...

If you have the [stop work when navigating to FogBugz non-case URL](#stop-when-nav-non-case) option on and you navigate to a URL that is still part of your configured [FogBugz URL](#fb-url) host (i.e. a wiki, or a case filtler listing, etc.), it will:

1. Initiate a [stop work automatically](#how-stop-work) cycle

### [Resume work automatically](#how-resume-work)

If you have the [resume work when returning from idle](#resume-returning-idle) option on and your computer returns from sleep and/or begins activity (i.e. you type a key, move the mouse, etc.), it will:

1. Initiate a [start work automatically](#how-start-work) cycle on the case you were working on prior to the inactivity



## [|](#options) Options

### [Auto work on viewed cases](#options-autowork) 

Turn this option on to [automatically start work](#how-start-work) on any case you open or view in any tab in chrome. This basically listens for both the [onActivated](https://developer.chrome.com/extensions/tabs#event-onActivated) and [onUpdated](https://developer.chrome.com/extensions/tabs#event-onUpdated) chrome tab events, and will auto-work on any case found in the updated and/or activated tabs.

### [Auto work on viewed cases delay](#autowork-delay)

In seconds.

Delay this number of seconds at the start of the [auto start work](#how-start-work) cycle. Helpful if you often quickly change tabs to reference notes in subcases, etc. of the case you're actually working on.

### [Notify when start/stop work on cases](#notify-start-stop)

Turn this on to get a confirmation notification at the end of the [auto start work](#how-start-work) and [auto stop work](#how-stop-work) cycles that you indeed have started or stopped case work.

### [Stop work when idle for (seconds)](#options-stop-idle-after)

In seconds.  Minimum value supported by chrome is 15 seconds, which will be used if you enter something > 0 and < 15.  Set to 0 or negative to disable [auto stop work](#how-stop-work) cycles.

Number of seconds your computer should be idle before [auto stop work](#how-stop-work) cycle begins.

If this is set > 0 it also always includes handling of computer sleep/hibernate as well.

### [Resume work when returning from idle](#resume-returning-idle) (on previously active case)

Turn this on to [auto start work](#how-start-work) on the case that was active prior to an [auto stop work](#how-stop-work) event.

Ignored if [stop work when idle](#options-stop-idle-after) option is <= 0.

### [Stop work when navigating to FogBugz non-case URL](#stop-when-nav-non-case) 

Turn this on to [auto stop work](#how-stop-work) when navigating to a URL that is still within your configured [FogBugz URL](#fb-url) host domain but is NOT a case url, i.e.:

* Case listings (e.g. myfbsubdomain.fogbugz.com/f/filters/...)
* Case outlines
* Search results
* Wikis
* etc.

### [FogBugz URL](#fb-url) 

Your FogBugz URL.



## [|](#popup) Extension Popup

Here you can enter or change the credentials you use to link to FogBugz and the CR API.  You only need to enter these once per browser instance you plan to use (we do not sync credentials with the extension purposely for now).

#### [FogBugz API Token](#popup-fb-token)

See the following FB article for information on how to get an API token for your user:

http://help.fogcreek.com/8447

#### [CentralReach Api User and Password](#popup-cr-creds)

The Username and Password for the CR account to which the FB token and any future integrations with CR would be effected within.  Typically this would be your personal CR organization credentials.

Currently, there is no direct integration with the CR platform, though this may change in the future. 
