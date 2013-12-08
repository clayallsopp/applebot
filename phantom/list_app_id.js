var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("list_app_id.js");

var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var searchInADC = function() {
    var LOAD_URL = "https://developer.apple.com/account/ios/identifiers/bundle/bundleList.action";
    applebot.openPage(LOAD_URL, function(page){
        var appIds = {};
        applebot.action("Grab app id info", function() {
            appIds = page.evaluate(function() {
                var appIds = {};
                var ids = $(".ui-widget-content.jqgrow.ui-row-ltr");
                ids.each(function() {
                    var $el = this;
                    var name = $(".ui-ellipsis.bold", $el).first().attr('title');
                    var appId = $(".ui-ellipsis", $el).last().attr("title");
                    appIds[appId] = name;
                });
                return appIds
            });
        });

        applebot.action("Grab app id info");
        applebot.result(appIds);
    });
};

var searchInITC = function() {
    var LOAD_URL = "https://itunesconnect.apple.com";
    applebot.openPage(LOAD_URL, function(page){
        var appIds = {};

        applebot.action("Click the Add New App button", function() {
            page.click('.upload-app-button a');
        });

        applebot.action("Grab app id info", function() {
            appIds = applebot.shortcuts.filterBundleIdsFromItunesConnect(page, true);
        });

        applebot.step("Wait for Manage Your Apps", 'waitForText', 'Recent Activity', function() {
            applebot.action("Click the Add New App button");
        });

        applebot.step("Wait for the New App Information page", 'waitForSelector', '#mainForm', function() {
            applebot.action("Grab app id info");
            applebot.result(appIds);
        });

        applebot.shortcuts.openManageApps(page);
    });
};

if (userOptions.source === 'itc') {
    searchInITC();
}
else {
    searchInADC();
}