var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("create_profile.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://developer.apple.com/account/ios/profile/profileCreate.action";

applebot.openPage(LOAD_URL, function(page){
    applebot.action("Select the profile type", function() {
        var fillOptions = {};
        if (userOptions.environment === 'development') {
            fillOptions['distributionType'] = 'limited';
        }
        else if (userOptions.environment === 'store') {
            fillOptions['distributionType'] = 'store';
        }
        else if (userOptions.environment === 'adhoc') {
            fillOptions['distributionType'] = 'adhoc';
        }
        else if (userOptions.environment == 'inhouse') {
            fillOptions['distributionType'] = 'inhouse';
        }

        page.fill("form[successurl='/account/ios/profile/profileCreateApp.action']", fillOptions, false);
        page.click('.submit');
    });

    applebot.action("Select the app ID", function() {
        var fillOptions = {};

        var value = page.evaluate(function(appId) {
            var matchId = false;

            var options = $("select[name=appIdId]").children();
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                if (option.innerHTML.indexOf(appId + ")") !== -1) {
                    matchId = option.value;
                }
            }

            return matchId;
        }, userOptions.app_id);

        if (value === false) {
            page.die("Error: Could not find App ID option");
        }
        else {
            fillOptions['appIdId'] = value;
        }

        page.fill("form[successurl='/account/ios/profile/profileCreateCertificates.action']", fillOptions, false);
        page.click('.submit');
    });

    applebot.action("Select the certificate", function() {
        var fillOptions = {};
        var certificateValue = page.evaluate(function(certificate) {
            if (certificate === void(0)) {
                return $(".validate").first().val();
            }
            var value = false;

            var options = $(".distribution .rows");
            for (var i = 0; i < options.length; i++) {
                var option = options[i];
                if ($(".title", option).text() == certificate) {
                    value = $("input", option).val()
                }
            }

            return value;
        }, userOptions.certificate);

        if (certificateValue === false) {
            page.die("Error: Could not find matching certificate");
        }
        else {
            fillOptions['certificateIds'] = certificateValue;
        }
        page.fill("form[successurl='/account/ios/profile/profileCreateName.action']", fillOptions, false);
        page.click('.submit');
    });

    applebot.action("Select the provisioning profile name", function() {
        var fillOptions = {
            'provisioningProfileName': userOptions.name
        };
        page.fill("form[successurl='/account/ios/profile/profileDownload.action?provisioningProfileId=']", fillOptions, false);
        page.click('.submit');
    });

    applebot.action("Download profile", function() {
        var downloadUrl = page.evaluate(function() {
            return $(".blue").attr('href');
        });
        page.download(downloadUrl, userOptions.download_to);
    });

    applebot.step("Wait to pick bundle ID", 'waitForSelector', "form[successurl='/account/ios/profile/profileCreateCertificates.action']", function() {
        applebot.action("Select the app ID");
    });

    applebot.step("Wait to pick bundle certificate", 'waitForSelector', "form[successurl='/account/ios/profile/profileCreateName.action']", function() {
        applebot.action("Select the certificate");
    });

    applebot.step("Wait to pick profile name", 'waitForSelector', "form[successurl='/account/ios/profile/profileDownload.action?provisioningProfileId=']", function() {
        applebot.action("Select the provisioning profile name");
    });

    applebot.step("Wait for profile to generate", 'waitForText', 'Your provisioning profile is ready.', function() {
        if (userOptions.download_to) {
            applebot.action("Download profile");
        }

        page.echo("Success").exit();
    }, {
        onFail: function() {
            page.debugHTML();
        },
        timeout: 10 * 1000
    });

    // Start
    applebot.action("Select the profile type");
});