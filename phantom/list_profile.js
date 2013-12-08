var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("list_profile.js");

var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var profileType = {
    development: 'limited',
    distribution: 'production'
}[userOptions.profile_type || "development"];

var LOAD_URL = "https://developer.apple.com/account/ios/profile/profileList.action?type=" + profileType;

applebot.openPage(LOAD_URL, function(page){
    applebot.shortcuts.waitToParseProfiles(applebot, page, profileType, function(parsedProfiles) {
        applebot.result(parsedProfiles);
    });
});