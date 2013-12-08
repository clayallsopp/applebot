var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("update_app.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://itunesconnect.apple.com";

applebot.openPage(LOAD_URL, function(page){
    var findFieldName = applebot.shortcuts.findFieldName;
    var updateAlreadyExists = false;

    var addWaitForVersionInfoStep = function(callback) {
        var callbackImpl = callback;
        if (typeof callback === "string") {
            callbackImpl = function() {
                applebot.action(callback);
            }
        }
        applebot.step("Wait for update version info screen", 'waitForText','App Store Contact Information', callbackImpl);
    }
    this.addWaitForVersionInfoStep = addWaitForVersionInfoStep;

    var waitForMetadataToClose = function() {
        applebot.step("Wait for metadata screen to close", 'waitWhileVisible', '#fileInput_35InchRetinaDisplayScreenshots');
    }

    this.handleLargeIcon = function() {
        addWaitForVersionInfoStep("Click the Version Information edit button");
        applebot.step("Wait for the app icon upload screen", 'waitForSelector', 'form[name="FileUploadForm_largeAppIcon"]', function() {
            applebot.action("Update app icon");
        });
        applebot.step("Wait for the app icon to change", 'waitWhileVisible', '.lcUploaderImage .lcUploaderImageWellSpinner', function() {
            applebot.action("Close app icon update screen");
        })
        applebot.step("Wait for Version Information screen to close", 'waitWhileVisible', 'form[name="FileUploadForm_largeAppIcon"]');
    };

    this.handleNewTitle = function() {
        addWaitForVersionInfoStep("Click the Metadata edit button");
        applebot.step("Wait for the app title upload screen", 'waitForSelector', '#fileInput_35InchRetinaDisplayScreenshots', function() {
            applebot.action("Update app title");
        });
        applebot.step("Wait for the app title to confirm", 'waitWhileVisible', '#appNameUpdateSpinnerId', function() {
            applebot.action("Save Metadata changes");
        });
        waitForMetadataToClose();
    };


    var waitForScreenshotsToBeEmpty = function(type, selectorId, callback) {
        applebot.step("Wait for all " + type + " screenshots to be cleared", 'waitFor', function() {
            var buttonCount = page.evaluate(function(selectorId) {
                var screenshotContainer = Array.prototype.slice.call(document.querySelectorAll(".lcUploaderPictureSet")).filter(function(el) {
                    return el.id === selectorId;
                })[0];
                var deleteButtons = screenshotContainer.querySelectorAll(".lcUploaderImageDelete");
                return deleteButtons.length;
            }, selectorId);
            return buttonCount === 0;
        },callback);
    }
    this.handleScreenshots35 = function() {
        addWaitForVersionInfoStep("Click the Metadata edit button");
        applebot.step("Wait for the app title upload screen", 'waitForSelector', '#fileInput_35InchRetinaDisplayScreenshots', function() {
            applebot.action("Clear 3.5in screenshots");
        });
        waitForScreenshotsToBeEmpty("3.5in", "35InchRetinaDisplayScreenshots", function() {
            applebot.action("Upload next 3.5in screenshot");
        });
        var screenshotStepOption = {
            key_path: 'screenshots_35',
            selector: 'div.iPhoneScreenshot',
            description: "3.5in",
            next_step: "Save Metadata changes",
            while_step: "Upload next 3.5in screenshot"
        };
        applebot.shortcuts.addStepsForScreenshotGroup(applebot, page, userOptions, screenshotStepOption);
        waitForMetadataToClose();
    };

    this.handleScreenshots4 = function() {
        addWaitForVersionInfoStep("Click the Metadata edit button");
        applebot.step("Wait for the app title upload screen", 'waitForSelector', '#fileInput_35InchRetinaDisplayScreenshots', function() {
            applebot.action("Clear 4in screenshots");
        });

        waitForScreenshotsToBeEmpty("4in", "iPhone5", function() {
            applebot.action("Upload next 4in screenshot");
        });
        var screenshotStepOption = {
            key_path: 'screenshots_4',
            selector: 'div.SortedN41ScreenShot',
            description: "4in",
            next_step: "Save Metadata changes",
            while_step: "Upload next 4in screenshot"
        };
        applebot.shortcuts.addStepsForScreenshotGroup(applebot, page, userOptions, screenshotStepOption);
        waitForMetadataToClose();
    };

    applebot.action("Click the 'See All' link", function() {
        page.click('.seeAll a');
    });

    applebot.action("Fill the apps search box", function() {
        applebot.shortcuts.searchITCApps(page, {title: userOptions.title});
    });

    applebot.action("Upload next 3.5in screenshot", function() {
        var screenshotPath = applebot.shortcuts.popScreenshotPaths(userOptions, 'screenshots_35');
        page.fillSelectors('form[name="FileUploadForm_35InchRetinaDisplayScreenshots"]', {
            '#fileInput_35InchRetinaDisplayScreenshots': screenshotPath
        }, false);
    });

    applebot.action("Upload next 4in screenshot", function() {
        var screenshotPath = applebot.shortcuts.popScreenshotPaths(userOptions, 'screenshots_4');
        page.fillSelectors('form[name="FileUploadForm_iPhone5"]', {
            '#fileInput_iPhone5': screenshotPath
        }, false);
    });

    applebot.action('Find the add version button and click it', function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector('Add Version', page);
        page.click(hrefSelector);
    })

    applebot.action('View details of pending update', function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector('View Details', page, '.column-container.right');
        page.click(hrefSelector);
    });

    applebot.action('Fill initial update info form', function() {
        var fillOptions = {};

        var versionFieldName = findFieldName(page, "Version Number", '.middle > div');
        fillOptions['input[name="' + versionFieldName + '"]'] = userOptions.app_version;

        fillOptions['textarea'] = userOptions.update_description;

        page.fillSelectors('#mainForm', fillOptions, false);

        page.click('.saveChangesActionButton');
    });

    applebot.action('Click the Ready to Upload Binary button', function() {
        try {
            page.click(".customActionButton");
        }
        catch(err) {
            // Button didn't exist, which means an update already
            if (updateAlreadyExists) {
                console.log("Finishing - binary was already ready to upload");
                page.exit(0);
            }
            else {
                page.die("Could not find the Ready To Upload button but an update was not already pending");
            }
        }
    })

    applebot.action("Click the Version Information edit button", function() {
        page.click("h2 a");
    });

    applebot.action("Click the Metadata edit button", function() {
        page.click("#localizationLightboxUpdate a");
    });

    applebot.action("Update app icon", function() {
        page.fillSelectors('form[name="FileUploadForm_largeAppIcon"]', {
            '#fileInput_largeAppIcon': userOptions.large_icon
        }, false);
    });

    applebot.action("Save Metadata changes", function() {
        page.click("#lightboxSaveButtonEnabled");
    })

    applebot.action('Close app icon update screen', function() {
        page.click("#lightboxSaveButtonEnabled");
    })

    applebot.action("Update app title", function() {
        var fillOptions = {};

        page.evaluate(function(newTitle) {
            document.querySelector('#appNameUpdateContainerId input').value = newTitle;
            document.querySelector('#appNameUpdateContainerId input').onblur();
        }, userOptions.new_title);
    });

    var clearScreenshots = function(selectorId) {
        page.evaluate(function(selectorId) {
            var screenshotContainer = Array.prototype.slice.call(document.querySelectorAll(".lcUploaderPictureSet")).filter(function(el) {
                return el.id === selectorId;
            })[0];
            var deleteButtons = screenshotContainer.querySelectorAll(".lcUploaderImageDelete");
            var buffer = "";
            Array.prototype.forEach.call(
                deleteButtons,
                function(button) {
                    buffer += ("" + button);
                    var click_ev = document.createEvent("MouseEvent");
                    click_ev.initEvent("click", true /* bubble */, true /* cancelable */);

                    try {
                        button.dispatchEvent(click_ev);
                    }
                    catch (e) {
                        buffer += ("" + e);
                    }
                }
            );
        }, selectorId);
    }
    applebot.action("Clear 3.5in screenshots", function() {
        clearScreenshots("35InchRetinaDisplayScreenshots");
    });

    applebot.action("Clear 4in screenshots", function() {
        clearScreenshots("iPhone5");
    });

    applebot.action('Fill export compliance page', function() {
        applebot.shortcuts.safeFill(page, '#mainForm', {
            'encryptionHasChanged': "false",
            'ipContentsQuestionRadio': 'false',
            'booleanRadioButton': 'false',
            'hasLegalIssues': 'false'
        }, false);
        page.click('.continueActionButton');
    });

    applebot.action('Fill version release date page', function() {
        page.fill("#mainForm", {
            'goLive': 'false'
        }, false);
        page.click('.saveChangesActionButton');
    })



    //////////////////////////
    // Steps

    //applebot.start("Click the 'Manage Your Apps' screen", applebot.shortcuts.openManageApps);

    applebot.shortcuts.addStepsToSearchAndClickAppTitle(applebot, page, userOptions.title, function() {
        try {
            applebot.action('Find the add version button and click it');
        }
        catch(err) {
            // Means there's already a submission pending
            updateAlreadyExists = true;
            applebot.action('View details of pending update');
        };
    })

    applebot.step("Wait for the new version page", 'waitForText', 'New Version', function() {
        applebot.action('Fill initial update info form');
    }, {
        onFail: function() {
            if (updateAlreadyExists) {
                return false;
            }
        }
    })

    var operations = [];
    if (userOptions.new_title && (userOptions.new_title != userOptions.title)) {
        operations.push('handleNewTitle');
    }
    if (userOptions.large_icon) {
        operations.push('handleLargeIcon');
    }
    if (userOptions.screenshots_4) {
        operations.push('handleScreenshots4');
    }
    if (userOptions.screenshots_35) {
        operations.push('handleScreenshots35');
    }

    var length = operations.length;
    for (var i = 0; i < length; i++) {
        this[operations.pop()]();
    }
    addWaitForVersionInfoStep('Click the Ready to Upload Binary button');

    applebot.step("Wait for the Export Compliance page", 'waitForText', 'Export Compliance', function() {
        applebot.action('Fill export compliance page');
    }, {
        timeout: 10 * 1000
    });

    applebot.step("Wait release date page", 'waitForText', "You can control when this version of your app is released to the App Store", function() {
        applebot.action('Fill version release date page');
    });


    applebot.shortcuts.openManageApps(page);
});