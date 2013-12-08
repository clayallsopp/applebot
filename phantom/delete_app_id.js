var require = patchRequire(require);

var fs = require('fs');
var AppleBot = require('applebot').AppleBot;
var CommandHandler = require('applebot').CommandHandler;

var commandHandler = new CommandHandler("delete_app_id.js");


var userOptions = commandHandler.parseArgs();
var applebot = new AppleBot(commandHandler.getAuthFromArgs());

var LOAD_URL = "https://developer.apple.com/account/ios/identifiers/bundle/bundleList.action";

applebot.openPage(LOAD_URL, function(page){
    page.waitForSelector('form[name=bundleEdit]', function() {
        this.click('.remove-button');
    }, function() {
        this.die("Error: Could not find edit form", 1);
    });
    page.waitForSelector('.red', function() {
        this.click('.red');
    }, function() {
        this.die("Error: Could not find delete button", 1);
    });
    page.waitForUrl(LOAD_URL, function() {
        this.echo("Success").exit();
    }, function() {
        this.die("Error: Did not finish delete", 1);
    });

    var clickCorrectElement = function(appId) {
        var rows = document.getElementsByClassName('ui-widget-content jqgrow ui-row-ltr');
        var match = undefined;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            for (var j = 0; j < row.children.length; j++) {
                var child = row.children[j];
                if (child.title == appId) {
                    match = child;
                }
            }
        }
        if (match) {
            $(match.parentNode).click();
            $('.edit-button').click();
            return true;
        }
        else {
            return false;
        }
    };
    var resultId = page.evaluate(clickCorrectElement, userOptions.app_id);
    if (resultId === false) {
        page.die("Error: could not find App Id");
    }
});