var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("remove_from_sale_app.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://itunesconnect.apple.com";
applebot.openPage(LOAD_URL, function(page){
    applebot.action("Click Rights and Pricing", function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector("Rights and Pricing", page, "#availableButtons");
        page.click(hrefSelector);
    });

    applebot.action("Open Specific Territories", function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector("specific territories", page, '#hideCountriesOption');
        page.click(hrefSelector);
    });

    applebot.action("Click Deselect All", function() {
        var hrefSelector = applebot.shortcuts.findHrefSelector("Deselect All", page, '.country-check-all');
        page.click(hrefSelector + ".right");
    });

    applebot.action("Click Save button", function() {
        page.click('.saveChangesActionButton');
    });


    applebot.shortcuts.addStepsToSearchAndClickAppTitle(applebot, page, userOptions.title, function() {
        applebot.action("Click Rights and Pricing");
    });

    applebot.step("Wait for Rights and Pricing page", 'waitForText', "Select the availability date", function() {
        applebot.action("Open Specific Territories");
        applebot.action("Click Deselect All");
        applebot.action("Click Save button");
    });

    applebot.step("Wait for changes to save", 'waitForText', 'Your changes have been saved.', function() {
        // done
    });

    applebot.shortcuts.openManageApps(page);
});