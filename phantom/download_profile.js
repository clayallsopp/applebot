var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("download_profile.js");

var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var profileType = {
    development: 'limited',
    distribution: 'production'
}[userOptions.profile_type || "development"];

var LOAD_URL = "https://developer.apple.com/account/ios/profile/profileList.action?type=" + profileType;

applebot.openPage(LOAD_URL, function(page){
    var profiles = {};

    applebot.shortcuts.waitToParseProfiles(applebot, page, profileType, function(parsedProfiles) {
        profiles = parsedProfiles;
        applebot.action("Download profile");
    });

    applebot.action("Download profile", function() {
        var profile = profiles[userOptions.app_id];
        if (!profile) {
            page.die("Could not find profile for app ID " + userOptions.app_id);
        }
        else {
            page.download(profile.download_url, userOptions.download_to);
        }
    });
});