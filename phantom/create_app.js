var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("create_app.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://itunesconnect.apple.com";

applebot.openPage(LOAD_URL, function(page){
    var findFieldName = applebot.shortcuts.findFieldName;

    applebot.action("Click the Add New App button", function() {
        page.click('.upload-app-button a');
    });

    applebot.action("Fill the App Information page", function() {
        var fillOptions = {
            '#appNameUpdateContainerId input': userOptions.title,
        };

        var skuFieldName = findFieldName(page, "SKU Number", '.middle > div');
        fillOptions['input[name="' + skuFieldName + '"]'] = userOptions.sku;

        var bundleIdsToFormValue = applebot.shortcuts.filterBundleIdsFromItunesConnect(page);
        var bundleIdValue = bundleIdsToFormValue[userOptions.id];
        if (!bundleIdValue) {
            page.die("Error: could not find App ID in options");
        }
        fillOptions['.bundleIdentifierBox select'] = bundleIdValue;


        page.fillSelectors('#mainForm', fillOptions, false);
        page.click('.continueActionButton');
    });

    applebot.action('Fill the availability date information', function() {
        var fillOptions = {};
        var userDate = userOptions.availability_date;
        if (userDate) {
            var userDateParts = userDate.split("/");
            if (userDateParts.length !== 3) {
                page.exit("Error: Incorrect date format, should be MM/DD/YYYY");
            }
            var userMonthToValue = function(userMonth) {
                return "" + parseInt(userMonth) - 1;
            };
            var userDayToValue = function(userDay) {
                return "" + parseInt(userDay) - 1;
            };
            var userYearToValue = function(userYear) {
                if (userYear == new Date().getFullYear()) {
                    return "0";
                }
                else {
                    return "1";
                }
            };
            fillOptions['.date-select-month select'] = userMonthToValue(userDateParts[0]);
            fillOptions['.date-select-day select'] = userDayToValue(userDateParts[1]);
            fillOptions['.date-select-year select'] = userYearToValue(userDateParts[2]);
        }

        var userTierToValue = function(userTier) {
            if (userTier === void(0) || userTier === 'free') {
                return "0";
            }
            // i.e. Tier 1 == return 1
            return userTier;
        }
        fillOptions["#pricingPopup"] = userTierToValue(userOptions.price_tier);

        page.fillSelectors('#mainForm', fillOptions, false);
        page.click('.continueActionButton');
    });

    applebot.action('Fill the version information page', function() {
        var fillOptions = {};

        ///////////////////////////////////////
        // Version Info
        var versionInfoSelector = '.app-version > div';
        var versionFieldName = findFieldName(page, "Version Number", versionInfoSelector);
        fillOptions['input[name="' + versionFieldName + '"]'] = userOptions.app_version;

        var copyrightFieldName = findFieldName(page, "Copyright", versionInfoSelector);
        fillOptions['input[name="' + copyrightFieldName + '"]'] = userOptions.copyright;

        ///////////////////////////////////////
        // Categories
        var categories = ["Book", "Business", "Catalogs",
            "Education", "Entertainment", "Finance",
            "Food &amp; Drink", "Games", "Health &amp; Fitness",
            "Lifestyle", "Medical", "Music", "Navigation",
            "News", "Photo &amp; Video", "Productivity",
            "Reference", "Social Networking", "Sports",
            "Travel", "Utilities", "Weather"
        ].map(function(cat) {
            return cat.toLowerCase().replace(/\s/g, "_").replace("&amp;", "and");
        });
        // TODO: games fucks up
        var userCategoryToValue = function(userPrimary) {
            return "" + categories.indexOf(userPrimary);
        };
        fillOptions["#version-primary-popup"] = userCategoryToValue(userOptions.primary_category);
        fillOptions["#version-secondary-popup"] = userCategoryToValue(userOptions.secondary_category);


        ///////////////////////////////////////
        // Content Ratings
        var allDescriptions = page.evaluate(function() {
            var descriptions = [];
            var binaryDescriptions = []
            var els = document.querySelectorAll('.mapping:first-child');
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                var parent = el.parentElement;
                if (parent.className !== "ratings-row") {
                    binaryDescriptions.push(el.innerHTML.trim());
                }
                else {
                    descriptions.push(el.innerHTML.trim());
                }
            }
            return {normal: descriptions, binary: binaryDescriptions};
        });
        var contentDescriptions = allDescriptions.normal;
        var binaryContentDescriptions = allDescriptions.binary;

        var numContentRatings = contentDescriptions.length;
        var contentDescriptionsToOptions = {};
        for (var i = 0; i < contentDescriptions.length; i++) {
            var description = contentDescriptions[i];
            var key = description.toLowerCase().replace(/\s/g, "_").replace(/\//g, "_").replace(/[^a-zA-Z0-9_]/g, "")
            contentDescriptionsToOptions[description] = key;
        }

        var iteratedValues = 0;
        for (var i = 1; i <= numContentRatings; i++) {
            var optionKey = contentDescriptionsToOptions[contentDescriptions[i - 1]];
            var noneValue = "(MZPurpleContentDescriptorLevelRating#" + (i + 20) + ")";
            var infrequentMildValue = "(MZPurpleContentDescriptorLevelRating#" + (iteratedValues + i) + ")";
            var frequentIntenseValue = "(MZPurpleContentDescriptorLevelRating#" + (iteratedValues + (i + 1)) + ")";
            var ratingValue = {
                'none': noneValue,
                'infrequent' : infrequentMildValue,
                'frequent': frequentIntenseValue
            };

            var fillValue = undefined;
            if (userOptions[optionKey]) {
                var userRating = userOptions[optionKey];
                fillValue = ratingValue[userRating];
            }
            if (!fillValue) {
                fillValue = ratingValue['none'];
            }
            var fillKey = 'input[name="' + i + '"]';
            fillOptions[fillKey] = fillValue;
            iteratedValues += 1;
        }

        // Binary Content Restrictions
        var numBinaryContentRatings = binaryContentDescriptions.length;
        var binaryContentDescriptionsToOptions = {};
        for (var i = 0; i < binaryContentDescriptions.length; i++) {
            var description = binaryContentDescriptions[i];
            var key = description.toLowerCase().replace(/\s/g, "_").replace(/\//g, "_").replace(/[^a-zA-Z0-9_]/g, "")
            binaryContentDescriptionsToOptions[description] = key;
        }
        iteratedValues = 0;
        for (var i = 1; i <= numBinaryContentRatings; i++) {
            var optionKey = binaryContentDescriptionsToOptions[binaryContentDescriptions[i - 1]];
            var noValue = "(MZPurpleContentDescriptorLevelRating#" + (i + iteratedValues + (numContentRatings * 3)) + ")";
            var yesValue = "(MZPurpleContentDescriptorLevelRating#" + (iteratedValues + i + 1 + (numContentRatings * 3)) + ")";
            var ratingValue = {
                'no': noValue,
                'yes' : yesValue
            };

            var fillValue = undefined;
            if (userOptions[optionKey]) {
                var userRating = userOptions[optionKey];
                fillValue = ratingValue[userRating];
            }
            if (!fillValue) {
                fillValue = ratingValue['no'];
            }
            var fillKey = 'input[name="' + (i + numContentRatings) + '"]';
            fillOptions[fillKey] = fillValue;
            iteratedValues += 1;
        }


        ///////////////////////////////////////
        // Metadata
        fillOptions["#descriptionUpdateContainerId textarea"] = userOptions.description;

        var metadataSelector = '.formfield-wrapper:nth-child(4) .app-info-container.app-landing.app-version > div';
        var keywordsField = findFieldName(page, "Keywords", metadataSelector);
        fillOptions['input[name="' + keywordsField + '"]'] = userOptions.keywords;
        var supportUrlField = findFieldName(page, "Support URL", metadataSelector);
        fillOptions['input[name="' + supportUrlField + '"]'] = userOptions.support_url;
        if(userOptions.marketing_url) {
            var marketingUrlField = findFieldName(page, "Marketing URL (Optional)", metadataSelector);
            fillOptions['input[name="' + marketingUrlField + '"]'] = userOptions.marketing_url;
        }

        ///////////////////////////////////////
        // Contact Info
        var contactInfoSelector = '#appReviewInitBox .field-section > div';
        var firstNameField = findFieldName(page, "First Name", contactInfoSelector);
        fillOptions['input[name="' + firstNameField + '"]'] = userOptions.first_name;
        var lastNameField = findFieldName(page, "Last Name", contactInfoSelector);
        fillOptions['input[name="' + lastNameField + '"]'] = userOptions.last_name;
        var emailField = findFieldName(page, "Email Address", contactInfoSelector);
        fillOptions['input[name="' + emailField + '"]'] = userOptions.email;
        var phoneField = findFieldName(page, "Phone Number", contactInfoSelector);
        fillOptions['input[name="' + phoneField + '"]'] = userOptions.phone;

        if (userOptions.notes) {
            fillOptions['#reviewnotes textarea'] = userOptions.notes;
        }

        page.fillSelectors('#versionInitForm', fillOptions, false);
    });

    applebot.action("Upload app icon", function() {
        page.fillSelectors('form[name="FileUploadForm_largeAppIcon"]', {
            '#fileInput_largeAppIcon': userOptions.large_icon
        }, false);
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

    applebot.action("Click Save button", function() {
        page.click('.saveChangesActionButton');
    });

    applebot.action("Click Ready To Upload Binary button", function() {
        page.click('.customActionButton');
    });

    applebot.action("Click the current version App Icon", function() {
        page.click('.app-icon a');
    });

    applebot.action('Fill export compliance page', function() {
        applebot.shortcuts.safeFill(page, '#mainForm', {
            'firstQuestionRadio': "false", // Is your app designed to use cryptography
            'ipContentsQuestionRadio': 'false',
            'booleanRadioButton': 'false',
            'hasLegalIssues': 'false'
        }, false);
        page.click('.saveChangesActionButton');
    });

    applebot.action("Click continue button", function() {
        page.click(".continueActionButton");
    });


    ///////////
    // Steps

    applebot.step("Wait for Manage Your Apps", 'waitForText', 'Recent Activity', function() {
        applebot.action("Click the Add New App button");
    });

    applebot.step("Wait for the New App Information page", 'waitForSelector', '#mainForm', function() {
        applebot.action("Fill the App Information page");
    });

    applebot.step("Wait for the Availability page", 'waitForText', 'Select the availability date and price tier for your app.', function() {
        applebot.action("Fill the availability date information");
    });

    applebot.step("Wait for the Version Info page", 'waitForSelector', '#versionInitForm', function() {
        applebot.action("Fill the version information page");
        applebot.action("Upload app icon");
    });

    applebot.step("Wait for the app icon to upload", 'waitForSelector', '.LargeApplicationIcon', function() {
        applebot.action("Upload next 3.5in screenshot");
    });

    var screenshotStepOptions = [{
        key_path: 'screenshots_35',
        selector: 'div.iPhoneScreenshot',
        description: "3.5in",
        next_step: "Upload next 4in screenshot",
        while_step: "Upload next 3.5in screenshot"
    }, {
        key_path: 'screenshots_4',
        selector: 'div.SortedN41ScreenShot',
        description: "4in",
        next_step: "Click Save button",
        while_step: "Upload next 4in screenshot"
    }];

    for (var k = 0; k < screenshotStepOptions.length; k++) {
        var screenshotStepOption = screenshotStepOptions[k];
        applebot.shortcuts.addStepsForScreenshotGroup(applebot, page, userOptions, screenshotStepOption);
    }

    applebot.step("Wait for the App Summary page", 'waitForSelector', '.version-container', function() {
        applebot.action("Click the current version App Icon");
    }, {
        timeout: 20 * 1000
    });

    applebot.step("Wait for App Version Summary page", 'waitForSelector', '.customActionButton', function() {
        applebot.action("Click Ready To Upload Binary button");
    }, {
        timeout: 10 * 1000
    });

    applebot.step("Wait for the Export Compliance page", 'waitForText', 'Export Compliance', function() {
        applebot.action('Fill export compliance page');
    }, {
        timeout: 10 * 1000
    });

    applebot.step("Wait for the Ready To Upload confirmation", 'waitForText', 'You are now ready to upload your binary', function() {
        applebot.action("Click continue button");
    }, {
        timeout: 10 * 1000
    });

    applebot.step("Wait for Version Information confirmation", 'waitForText','Waiting For Upload', function() {
        page.echo("Success");
    }, {
        timeout: 10 * 1000
    });


    applebot.shortcuts.openManageApps(page);
});