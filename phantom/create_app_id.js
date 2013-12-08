var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("create_app_id.js");

var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://developer.apple.com/account/ios/identifiers/bundle/bundleCreate.action";

applebot.openPage(LOAD_URL, function(page){
    applebot.action("Fill out App ID form", function() {
        var fillOptions = {};
        fillOptions['appIdName'] = userOptions.name;
        if (userOptions.app_id.indexOf("*") === -1) {
            fillOptions['type'] = 'explicit';
            fillOptions['explicitIdentifier'] = userOptions.app_id;
        }
        else {
            fillOptions['type'] = 'wildcard';
            fillOptions['wildcardIdentifier'] = userOptions.app_id;
        }

        if (userOptions.data_protection) {
            fillOptions['dataProtectionPermission'] = true;
            var dataProtectionToName = function(dataProtection) {
                return {
                    complete: 'complete',
                    unless_option: 'unlessopen',
                    until_first_auth: 'untilfirstauth'
                }[dataProtection];
            };
            fillOptions['dataProtectionPermissionLevel'] = dataProtectionToName(userOptions.data_protection);
        }

        var services = ['icloud', 'inter_app_audio', 'passbook', 'push'];
        var serviceToName = function(service) {
            return {
                icloud: 'iCloud',
                inter_app_audio: 'IAD53UNK2F',
                passbook: 'pass',
                push: 'push'
            }[service];
        };
        for (var i = 0; i < services.length; i++) {
            var service = services[i];
            if(userOptions[service] && userOptions[service] !== 'false') {
                fillOptions[serviceToName(service)] = true;
            }
        }

        page.fill('form[name=bundleSave]', fillOptions, false);
    });

    applebot.action("Click App ID submit button", function() {
        page.click('.submit');
    });

    applebot.action("Click the confirm button", function() {
        page.click('.submit');
    });

    applebot.step("Wait for the confirmation page", "waitForSelector", 'form[name=bundleSubmit]', function() {
        applebot.action("Click the confirm button");
    }, function() {
        page.debugHTML();
    });

    applebot.step("Wait for a completed form", 'waitForSelector', '.ios.bundles.confirmForm.complete', function() {
        // Goood to go
    }, function() {
        page.debugHTML();
    });

    applebot.action("Fill out App ID form");
    applebot.action("Click App ID submit button");
});