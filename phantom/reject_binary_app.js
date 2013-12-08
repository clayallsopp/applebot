var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("remove_from_sale_app.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://itunesconnect.apple.com";
applebot.openPage(LOAD_URL, function(page){
    applebot.action("Click current version", function() {
        page.click(".version .column-container a.blue-btn");
    });

    applebot.action("Click next version", function() {
        page.click(".version .column-container.right a.blue-btn");
    });

    applebot.action("Click Binary Details", function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector("Binary Details", page, '#versionInfoLightboxUpdate');
        page.click(hrefSelector);
    });

    applebot.action("Click Reject Binary" ,function() {
        page.click(".lightbox-button");
    });


    applebot.shortcuts.addStepsToSearchAndClickAppTitle(applebot, page, userOptions.title, function() {
        if (userOptions.app_version) {
            var actionName = page.evaluate(function(app_version) {
                var nodes = document.querySelectorAll(".version-container p span");
                var actionName = null;
                for (var i = nodes.length - 1; i >= 0; i--) {
                    var node = nodes[i];
                    if (node.innerHTML == app_version) {
                        var relevantAncestor = node.parentElement.parentElement.parentElement.parentElement;
                        var classes = relevantAncestor.classList;
                        if (classes[1] === 'right') {
                            actionName = "Click next version";
                        }
                        else {
                            actionName = "Click current version";
                        }
                    }
                };
                return actionName;
            }, userOptions.app_version);
            applebot.action(actionName);
        }
        else {
            applebot.action("Click current version");
        }
    });

    applebot.step("Wait for version information page", 'waitForText', 'Version Information', function() {
        applebot.action("Click Binary Details");
    });

    applebot.step("Wait for Binary Details page", 'waitForText', 'Supported Architectures', function() {
        applebot.action("Click Reject Binary");
    });

    applebot.step("Wait for changes to save", 'waitForText', 'Supported Architectures', function() {
        // done
    });

    applebot.shortcuts.openManageApps(page);
});